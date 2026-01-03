"""
Multi-Turn Conversation Evaluation for 112 Call Center Agent
==============================================================

This module provides evaluation of complete multi-turn conversations,
testing the entire workflow from initial contact to ticket creation.

Features:
- Real session management across multiple turns
- Conversation-level metrics
- Workflow completion tracking
- State transition validation
- Response coherence evaluation
"""

import os
import sys
import json
import asyncio
import time
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
import requests

# DeepEval imports
from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams, ConversationalTestCase

# Local imports
from config import THRESHOLDS, EVALUATION_MODEL
from multi_turn_test_cases import (
    MultiTurnTestCase,
    ConversationTurn,
    generate_all_multi_turn_test_cases
)


# =============================================================================
# CONVERSATION-LEVEL METRICS
# =============================================================================

class WorkflowCompletionMetric(GEval):
    """Metric for evaluating workflow completion"""

    def __init__(self):
        super().__init__(
            name="Workflow Completion",
            criteria="""Evaluate if the conversation completed the emergency reporting workflow correctly.

            Expected workflow steps (in order):
            1. Emergency type detection and classification
            2. First aid guidance provision (for medical/fire emergencies)
            3. Location collection (address, ward, district, city)
            4. Phone number collection (skip for authenticated users with saved phone)
            5. Affected people count collection
            6. Information confirmation summary
            7. Ticket creation after user confirms

            Evaluation criteria:
            - All required steps were completed
            - Steps were in the correct order
            - No steps were skipped incorrectly
            - User was not asked for already-provided information
            - Final ticket was created with all correct information

            Score 1.0 if workflow completed correctly.
            Score 0.5 if workflow completed with minor issues.
            Score 0.0 if workflow failed or was incomplete.
            """,
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.EXPECTED_OUTPUT
            ],
            model=EVALUATION_MODEL,
            threshold=THRESHOLDS.g_eval
        )


class ConversationCoherenceMetric(GEval):
    """Metric for evaluating conversation coherence"""

    def __init__(self):
        super().__init__(
            name="Conversation Coherence",
            criteria="""Evaluate the coherence of the multi-turn conversation.

            A coherent conversation should:
            1. Maintain context from previous turns
            2. Not repeat questions already answered
            3. Reference previously provided information correctly
            4. Progress logically through the workflow
            5. Handle corrections without confusion
            6. Maintain consistent tone and language

            Score based on overall coherence of the conversation flow.
            """,
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT
            ],
            model=EVALUATION_MODEL,
            threshold=THRESHOLDS.g_eval
        )


class StateTransitionMetric(GEval):
    """Metric for evaluating state transitions"""

    def __init__(self):
        super().__init__(
            name="State Transition Accuracy",
            criteria="""Evaluate if the chatbot correctly transitions between conversation states.

            Valid state transitions:
            - START -> COLLECT_EMERGENCY
            - COLLECT_EMERGENCY -> FIRST_AID -> COLLECT_LOCATION
            - COLLECT_LOCATION -> COLLECT_PHONE (or skip if authenticated)
            - COLLECT_PHONE -> COLLECT_PEOPLE
            - COLLECT_PEOPLE -> CONFIRMATION
            - CONFIRMATION -> CREATE_TICKET (if confirmed)
            - CONFIRMATION -> CORRECTION (if user corrects)
            - CORRECTION -> CONFIRMATION (after processing correction)
            - CREATE_TICKET -> COMPLETE

            Score 1.0 if all transitions were correct.
            Score 0.5 if minor transition issues.
            Score 0.0 if major transition errors.
            """,
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.CONTEXT
            ],
            model=EVALUATION_MODEL,
            threshold=THRESHOLDS.g_eval
        )


class InformationExtractionMetric(GEval):
    """Metric for evaluating information extraction across turns"""

    def __init__(self):
        super().__init__(
            name="Information Extraction Accuracy",
            criteria="""Evaluate if the chatbot correctly extracted all required information.

            Required information:
            1. Emergency type(s): FIRE_RESCUE, MEDICAL, SECURITY
            2. Location: address, ward, district, city
            3. Phone number: valid Vietnamese format
            4. Affected people: total count (and injured/critical if applicable)

            Evaluation:
            - All information correctly extracted
            - Information matches what user provided
            - Corrections were properly applied
            - Final ticket contains correct information

            Score based on extraction accuracy.
            """,
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.EXPECTED_OUTPUT
            ],
            model=EVALUATION_MODEL,
            threshold=THRESHOLDS.g_eval
        )


class UserCorrectionHandlingMetric(GEval):
    """Metric for evaluating how corrections are handled"""

    def __init__(self):
        super().__init__(
            name="Correction Handling",
            criteria="""Evaluate how well the chatbot handles user corrections.

            Good correction handling should:
            1. Correctly identify that user is making a correction
            2. Extract the new/corrected information
            3. Update the relevant fields only
            4. Show updated confirmation with new information
            5. Not ask for information again unnecessarily
            6. Not confuse correction with confirmation

            Score based on correction handling quality.
            """,
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.CONTEXT
            ],
            model=EVALUATION_MODEL,
            threshold=THRESHOLDS.g_eval
        )


class FirstAidGuidanceQualityMetric(GEval):
    """Metric for evaluating first aid guidance in conversation"""

    def __init__(self):
        super().__init__(
            name="First Aid Guidance Quality",
            criteria="""Evaluate the quality of first aid guidance provided during the conversation.

            Good first aid guidance should:
            1. Be provided after emergency type is identified
            2. Be relevant to the specific emergency
            3. Be based on verified medical knowledge
            4. Be actionable and clear
            5. Not include calls to emergency services (user is already calling 112)
            6. Not include advice to go to hospital (responders are being dispatched)

            Score based on guidance quality and relevance.
            """,
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.CONTEXT
            ],
            model=EVALUATION_MODEL,
            threshold=THRESHOLDS.g_eval
        )


# =============================================================================
# MULTI-TURN EVALUATION RESULT
# =============================================================================

@dataclass
class TurnResult:
    """Result for a single turn in the conversation"""
    turn_number: int
    user_message: str
    bot_response: str
    expected_actions: List[str]
    expected_next_step: str
    actual_next_step: Optional[str]
    extractions: Dict[str, Any]
    validation_passed: List[str]
    validation_failed: List[str]
    duration_ms: float
    errors: List[str]


@dataclass
class MultiTurnEvaluationResult:
    """Result of a complete multi-turn conversation evaluation"""
    test_case_id: str
    name: str
    category: str
    turns: List[TurnResult]
    total_turns: int
    completed_turns: int
    workflow_completed: bool
    ticket_created: bool
    ticket_id: Optional[str]
    metrics: Dict[str, float]
    overall_passed: bool
    total_duration_ms: float
    timestamp: str
    errors: List[str]
    conversation_log: List[Dict[str, str]]


# =============================================================================
# MULTI-TURN EVALUATOR
# =============================================================================

class MultiTurnEvaluator:
    """Evaluator for multi-turn conversations"""

    def __init__(
        self,
        chatbot_url: str = "http://localhost:5000",
        model: str = EVALUATION_MODEL
    ):
        self.chatbot_url = chatbot_url
        self.model = model
        self.session_counter = 0
        self.results: List[MultiTurnEvaluationResult] = []

        # Initialize metrics
        self.metrics = {
            "workflow_completion": WorkflowCompletionMetric(),
            "conversation_coherence": ConversationCoherenceMetric(),
            "state_transition": StateTransitionMetric(),
            "information_extraction": InformationExtractionMetric(),
            "correction_handling": UserCorrectionHandlingMetric(),
            "first_aid_guidance": FirstAidGuidanceQualityMetric(),
        }

    def generate_session_id(self) -> str:
        """Generate unique session ID"""
        self.session_counter += 1
        return f"multi_eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{self.session_counter}"

    def send_message(
        self,
        message: str,
        session_id: str,
        is_authenticated: bool = False,
        user_id: Optional[str] = None
    ) -> Tuple[Dict[str, Any], float]:
        """Send message to chatbot and get response with timing"""

        start_time = time.time()

        payload = {
            "message": message,
            "sessionId": session_id,
            "context": []
        }

        headers = {"Content-Type": "application/json"}
        if is_authenticated and user_id:
            headers["Authorization"] = f"Bearer {user_id}"

        try:
            response = requests.post(
                f"{self.chatbot_url}/api/chat/message",
                json=payload,
                headers=headers,
                timeout=60
            )
            response.raise_for_status()
            result = response.json()
        except requests.exceptions.RequestException as e:
            result = {
                "success": False,
                "error": str(e),
                "data": {"response": f"Error: {str(e)}"}
            }

        duration_ms = (time.time() - start_time) * 1000

        return result, duration_ms

    def clear_session(self, session_id: str):
        """Clear a chat session"""
        try:
            requests.delete(
                f"{self.chatbot_url}/api/chat/session/{session_id}",
                timeout=10
            )
        except:
            pass

    def validate_turn(
        self,
        turn: ConversationTurn,
        response: Dict[str, Any],
        conversation_log: List[Dict[str, str]]
    ) -> Tuple[List[str], List[str]]:
        """Validate a single turn against expected criteria"""

        passed = []
        failed = []

        bot_response = response.get("data", {}).get("response", "")

        for criterion in turn.validation_criteria:
            # Simple validation based on keywords/patterns
            criterion_lower = criterion.lower()

            if "should detect" in criterion_lower:
                # Check if emergency type was detected
                if any(t in bot_response.upper() for t in ["CHÁY", "CỨU HỎA", "FIRE", "Y TẾ", "CẤP CỨU", "MEDICAL", "AN NINH", "CÔNG AN", "SECURITY"]):
                    passed.append(criterion)
                else:
                    # Might be in the ticketInfo
                    ticket_info = response.get("data", {}).get("ticketInfo", {})
                    if ticket_info.get("emergencyTypes"):
                        passed.append(criterion)
                    else:
                        failed.append(criterion)

            elif "should ask for" in criterion_lower:
                # Check if bot is asking for something
                ask_keywords = ["cho tôi", "vui lòng", "cung cấp", "số điện thoại", "địa chỉ", "bao nhiêu người"]
                if any(kw in bot_response.lower() for kw in ask_keywords):
                    passed.append(criterion)
                else:
                    failed.append(criterion)

            elif "should extract" in criterion_lower or "should validate" in criterion_lower:
                # Check if extraction happened
                ticket_info = response.get("data", {}).get("ticketInfo", {})
                if ticket_info or response.get("data", {}).get("response"):
                    passed.append(criterion)
                else:
                    failed.append(criterion)

            elif "should create ticket" in criterion_lower:
                # Check if ticket was created
                if response.get("data", {}).get("ticketId") or response.get("data", {}).get("shouldCreateTicket"):
                    passed.append(criterion)
                else:
                    failed.append(criterion)

            elif "should show confirmation" in criterion_lower:
                # Check for confirmation keywords
                if "xác nhận" in bot_response.lower() or "confirmation" in bot_response.lower() or "📋" in bot_response:
                    passed.append(criterion)
                else:
                    failed.append(criterion)

            elif "should not ask for phone" in criterion_lower:
                # Check that phone is not being asked
                if "số điện thoại" not in bot_response.lower() and "liên hệ" not in bot_response.lower():
                    passed.append(criterion)
                else:
                    failed.append(criterion)

            else:
                # Default: check if response is reasonable
                if len(bot_response) > 10:
                    passed.append(criterion)
                else:
                    failed.append(criterion)

        return passed, failed

    async def evaluate_conversation(
        self,
        test_case: MultiTurnTestCase,
        verbose: bool = False
    ) -> MultiTurnEvaluationResult:
        """Evaluate a complete multi-turn conversation"""

        session_id = self.generate_session_id()
        start_time = datetime.now()
        turn_results = []
        conversation_log = []
        errors = []
        ticket_id = None
        workflow_completed = False
        ticket_created = False

        if verbose:
            print(f"\n  Evaluating: {test_case.name}")
            print(f"  Session: {session_id}")

        try:
            for i, turn in enumerate(test_case.turns):
                turn_start = time.time()

                if verbose:
                    print(f"    Turn {i+1}: {turn.user_message[:50]}...")

                # Send message
                response, duration_ms = self.send_message(
                    message=turn.user_message,
                    session_id=session_id,
                    is_authenticated=test_case.is_authenticated,
                    user_id="test_user" if test_case.is_authenticated else None
                )

                bot_response = response.get("data", {}).get("response", "Error: No response")

                # Log conversation
                conversation_log.append({"role": "user", "message": turn.user_message})
                conversation_log.append({"role": "bot", "message": bot_response})

                # Validate turn
                passed, failed = self.validate_turn(turn, response, conversation_log)

                # Check for ticket creation
                if response.get("data", {}).get("ticketId"):
                    ticket_id = response["data"]["ticketId"]
                    ticket_created = True

                # Determine actual next step (simplified)
                actual_next_step = None
                if "địa chỉ" in bot_response.lower():
                    actual_next_step = "location"
                elif "số điện thoại" in bot_response.lower():
                    actual_next_step = "phone"
                elif "bao nhiêu người" in bot_response.lower():
                    actual_next_step = "people"
                elif "xác nhận" in bot_response.lower():
                    actual_next_step = "confirmation"
                elif ticket_id:
                    actual_next_step = "complete"

                turn_result = TurnResult(
                    turn_number=i + 1,
                    user_message=turn.user_message,
                    bot_response=bot_response,
                    expected_actions=turn.expected_bot_actions,
                    expected_next_step=turn.expected_next_step,
                    actual_next_step=actual_next_step,
                    extractions=turn.expected_extractions,
                    validation_passed=passed,
                    validation_failed=failed,
                    duration_ms=duration_ms,
                    errors=[]
                )

                turn_results.append(turn_result)

                if verbose:
                    status = "" if not failed else ""
                    print(f"      {status} {len(passed)}/{len(passed)+len(failed)} validations passed")

                # Small delay between turns
                await asyncio.sleep(0.5)

        except Exception as e:
            errors.append(f"Conversation error: {str(e)}")

        finally:
            # Clear session
            self.clear_session(session_id)

        # Calculate workflow completion
        workflow_completed = (
            len(turn_results) == len(test_case.turns) and
            ticket_created == test_case.should_create_ticket
        )

        # Calculate metrics scores
        metric_scores = {}

        # Build full conversation text for metric evaluation
        full_conversation = "\n".join([
            f"{'User' if log['role'] == 'user' else 'Bot'}: {log['message']}"
            for log in conversation_log
        ])

        expected_output = json.dumps(test_case.expected_final_state, ensure_ascii=False)

        # Evaluate with each metric
        for metric_name, metric in self.metrics.items():
            try:
                test_case_for_metric = LLMTestCase(
                    input=full_conversation,
                    actual_output=conversation_log[-1]["message"] if conversation_log else "",
                    expected_output=expected_output,
                    context=[json.dumps(asdict(test_case), ensure_ascii=False)]
                )
                metric.measure(test_case_for_metric)
                metric_scores[metric_name] = metric.score
            except Exception as e:
                errors.append(f"Metric {metric_name} error: {str(e)}")
                metric_scores[metric_name] = 0.0

        # Determine overall pass
        # Use lower threshold (0.6) for multi-turn as it's more complex and subjective
        multi_turn_threshold = 0.6
        overall_passed = (
            workflow_completed and
            all(score >= multi_turn_threshold for score in metric_scores.values())
        )

        total_duration = (datetime.now() - start_time).total_seconds() * 1000

        result = MultiTurnEvaluationResult(
            test_case_id=test_case.id,
            name=test_case.name,
            category=test_case.category,
            turns=turn_results,
            total_turns=len(test_case.turns),
            completed_turns=len(turn_results),
            workflow_completed=workflow_completed,
            ticket_created=ticket_created,
            ticket_id=ticket_id,
            metrics=metric_scores,
            overall_passed=overall_passed,
            total_duration_ms=total_duration,
            timestamp=start_time.isoformat(),
            errors=errors,
            conversation_log=conversation_log
        )

        self.results.append(result)

        return result

    async def run_evaluation(
        self,
        test_cases: List[MultiTurnTestCase],
        categories: List[str] = None,
        max_cases: int = None,
        verbose: bool = True
    ) -> List[MultiTurnEvaluationResult]:
        """Run evaluation on multiple multi-turn test cases"""

        # Filter by categories
        if categories:
            test_cases = [tc for tc in test_cases if tc.category in categories]

        # Limit cases
        if max_cases:
            test_cases = test_cases[:max_cases]

        print(f"\n{'='*60}")
        print(f"MULTI-TURN CONVERSATION EVALUATION")
        print(f"{'='*60}")
        print(f"Total test cases: {len(test_cases)}")
        print(f"Categories: {set(tc.category for tc in test_cases)}")
        print(f"{'='*60}\n")

        self.results = []

        for i, test_case in enumerate(test_cases):
            if verbose:
                print(f"[{i+1}/{len(test_cases)}] {test_case.id}: {test_case.name}")

            result = await self.evaluate_conversation(test_case, verbose)

            if verbose:
                status = "" if result.overall_passed else ""
                print(f"  {status} Workflow: {'Complete' if result.workflow_completed else 'Incomplete'}, "
                      f"Ticket: {'Created' if result.ticket_created else 'Not created'}")

        return self.results

    def get_summary(self) -> Dict[str, Any]:
        """Get evaluation summary"""

        if not self.results:
            return {}

        total = len(self.results)
        passed = sum(1 for r in self.results if r.overall_passed)
        workflows_completed = sum(1 for r in self.results if r.workflow_completed)
        tickets_created = sum(1 for r in self.results if r.ticket_created)

        # Average metric scores
        metric_scores = {}
        for result in self.results:
            for metric, score in result.metrics.items():
                if metric not in metric_scores:
                    metric_scores[metric] = []
                metric_scores[metric].append(score)

        avg_metrics = {
            name: sum(scores) / len(scores)
            for name, scores in metric_scores.items()
        }

        # Category breakdown
        category_stats = {}
        for result in self.results:
            if result.category not in category_stats:
                category_stats[result.category] = {"passed": 0, "total": 0}
            category_stats[result.category]["total"] += 1
            if result.overall_passed:
                category_stats[result.category]["passed"] += 1

        category_pass_rates = {
            cat: data["passed"] / data["total"] * 100
            for cat, data in category_stats.items()
        }

        # Average turns per conversation
        avg_turns = sum(r.completed_turns for r in self.results) / total

        # Average duration
        avg_duration = sum(r.total_duration_ms for r in self.results) / total

        return {
            "total_conversations": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": passed / total * 100,
            "workflows_completed": workflows_completed,
            "workflow_completion_rate": workflows_completed / total * 100,
            "tickets_created": tickets_created,
            "ticket_creation_rate": tickets_created / total * 100,
            "average_turns": avg_turns,
            "average_duration_ms": avg_duration,
            "average_metrics": avg_metrics,
            "category_pass_rates": category_pass_rates,
            "evaluation_time": datetime.now().isoformat()
        }

    def export_results(self, filename: str = "multi_turn_evaluation_results.json"):
        """Export results to JSON"""

        # Convert dataclasses to dicts
        results_data = []
        for result in self.results:
            result_dict = asdict(result)
            # Convert turn results
            result_dict["turns"] = [asdict(t) if hasattr(t, '__dataclass_fields__') else t for t in result.turns]
            results_data.append(result_dict)

        data = {
            "summary": self.get_summary(),
            "results": results_data
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

        print(f"Results exported to {filename}")


# =============================================================================
# MAIN
# =============================================================================

async def main():
    """Main entry point for multi-turn evaluation"""
    import argparse

    parser = argparse.ArgumentParser(description="Multi-turn conversation evaluation")
    parser.add_argument("--quick", action="store_true", help="Quick evaluation (10 cases)")
    parser.add_argument("--category", type=str, help="Specific category to evaluate")
    parser.add_argument("--max-cases", type=int, help="Maximum cases to run")
    parser.add_argument("--chatbot-url", type=str, default="http://localhost:5000")
    parser.add_argument("--output", type=str, default="multi_turn_evaluation_results.json")
    parser.add_argument("--verbose", action="store_true", default=True)

    args = parser.parse_args()

    # Generate test cases
    print("Generating multi-turn test cases...")
    test_cases = generate_all_multi_turn_test_cases()

    # Apply filters
    categories = [args.category] if args.category else None
    max_cases = args.max_cases or (10 if args.quick else None)

    # Run evaluation
    evaluator = MultiTurnEvaluator(chatbot_url=args.chatbot_url)
    results = await evaluator.run_evaluation(
        test_cases=test_cases,
        categories=categories,
        max_cases=max_cases,
        verbose=args.verbose
    )

    # Print summary
    summary = evaluator.get_summary()
    print(f"\n{'='*60}")
    print("MULTI-TURN EVALUATION SUMMARY")
    print(f"{'='*60}")
    print(f"Total Conversations: {summary['total_conversations']}")
    print(f"Passed: {summary['passed']} ({summary['pass_rate']:.1f}%)")
    print(f"Workflow Completion: {summary['workflow_completion_rate']:.1f}%")
    print(f"Ticket Creation: {summary['ticket_creation_rate']:.1f}%")
    print(f"Average Turns: {summary['average_turns']:.1f}")
    print(f"Average Duration: {summary['average_duration_ms']:.0f}ms")
    print(f"\nMetric Scores:")
    for metric, score in summary.get('average_metrics', {}).items():
        print(f"  - {metric}: {score:.2f}")
    print(f"{'='*60}\n")

    # Export results
    evaluator.export_results(args.output)


if __name__ == "__main__":
    asyncio.run(main())
