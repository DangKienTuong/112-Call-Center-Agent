"""
112 Call Center Agent - Complete Evaluation Runner
====================================================

This script runs the complete evaluation pipeline with support for both:
1. Single-turn evaluation (~1000 test cases)
2. Multi-turn conversation evaluation (complete workflow testing)

Usage:
    # Single-turn evaluation (default, ~1000 test cases)
    python run_evaluation.py

    # Multi-turn conversation evaluation
    python run_evaluation.py --multi-turn

    # Quick evaluation (50 test cases)
    python run_evaluation.py --quick

    # Both single and multi-turn
    python run_evaluation.py --all

    # Specific category
    python run_evaluation.py --category emergency_type_detection

    # Custom output
    python run_evaluation.py --output-dir ./my_reports

Requirements:
    pip install -r requirements.txt
"""

import os
import sys
import asyncio
import argparse
import shutil
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import REPORT_CONFIG, TEST_CATEGORIES
from test_cases_generator import generate_all_test_cases, export_test_cases_to_json
from multi_turn_test_cases import generate_all_multi_turn_test_cases, export_multi_turn_test_cases
from evaluation import Evaluator
from multi_turn_evaluation import MultiTurnEvaluator
from report_generator import load_evaluation_results, generate_html_report, ReportData


# Multi-turn categories
MULTI_TURN_CATEGORIES = [
    "fire_emergency_flow",
    "medical_emergency_flow",
    "security_emergency_flow",
    "user_correction_flow",
    "authenticated_user_flow",
    "edge_case_flow"
]


def setup_output_directory(output_dir: str) -> Path:
    """Create output directory if it doesn't exist"""
    path = Path(output_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def print_banner(mode: str = "single"):
    """Print evaluation banner"""
    if mode == "multi":
        banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║     112 CALL CENTER AGENT - MULTI-TURN EVALUATION            ║
    ║                                                              ║
    ║  Complete Conversation Workflow Testing                      ║
    ║  Real Sessions | State Management | Workflow Completion      ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
        """
    elif mode == "all":
        banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║     112 CALL CENTER AGENT - COMPREHENSIVE EVALUATION         ║
    ║                                                              ║
    ║  Single-Turn + Multi-Turn Conversation Testing               ║
    ║  ~1000+ Test Cases | Complete Workflow | HTML Reports        ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
        """
    else:
        banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║     112 CALL CENTER AGENT - DEEPEVAL EVALUATION SYSTEM       ║
    ║                                                              ║
    ║  Comprehensive AI Chatbot Evaluation using DeepEval          ║
    ║  ~1000 Test Cases | Multiple Metrics | HTML Reports          ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
        """
    print(banner)


def print_categories(multi_turn: bool = False):
    """Print available test categories"""
    if multi_turn:
        print("\nAvailable Multi-Turn Categories:")
        print("-" * 40)
        for i, category in enumerate(MULTI_TURN_CATEGORIES, 1):
            print(f"  {i:2}. {category}")
    else:
        print("\nAvailable Single-Turn Categories:")
        print("-" * 40)
        for i, category in enumerate(TEST_CATEGORIES, 1):
            print(f"  {i:2}. {category}")
    print("-" * 40)


def check_chatbot_running(chatbot_url: str, force: bool = False) -> bool:
    """Check if chatbot is running"""
    import requests
    try:
        response = requests.get(f"{chatbot_url}/api/chat/health", timeout=5)
        if response.status_code == 200:
            print(f"  Chatbot is running at {chatbot_url}")
            return True
        else:
            print(f"  Warning: Chatbot health check failed")
    except Exception as e:
        print(f"  Warning: Cannot connect to chatbot at {chatbot_url}")
        print(f"  Make sure the chatbot server is running!")

    if not force:
        print(f"  Use --force to continue anyway")
        return False
    return True


async def run_single_turn_evaluation(args, output_dir: Path, timestamp: str) -> dict:
    """Run single-turn evaluation"""

    print(f"\n[SINGLE-TURN] Generating test cases...")
    print("-" * 50)

    # Generate test cases
    test_cases = generate_all_test_cases()

    test_cases_file = output_dir / f"single_turn_test_cases_{timestamp}.json"
    export_test_cases_to_json(test_cases, str(test_cases_file))

    print(f"  Generated {len(test_cases)} test cases")
    print(f"  Saved to: {test_cases_file}")

    # Apply filters
    if args.category and args.category in TEST_CATEGORIES:
        test_cases = [tc for tc in test_cases if tc.category == args.category]
        print(f"  Filtered to category '{args.category}': {len(test_cases)} cases")

    if args.quick:
        max_cases = args.max_cases or 50
        test_cases = test_cases[:max_cases]
        print(f"  Quick mode: limited to {len(test_cases)} cases")
    elif args.max_cases:
        test_cases = test_cases[:args.max_cases]
        print(f"  Limited to {len(test_cases)} cases")

    print(f"\n[SINGLE-TURN] Running evaluation...")
    print("-" * 50)

    # Initialize evaluator
    evaluator = Evaluator(chatbot_url=args.chatbot_url)

    # Run evaluation
    results = await evaluator.run_evaluation(
        test_cases=test_cases,
        verbose=args.verbose
    )

    # Export results
    results_file = output_dir / f"single_turn_results_{timestamp}.json"
    evaluator.export_results(str(results_file))

    summary = evaluator.get_summary()
    print(f"\n  Single-turn evaluation complete!")
    print(f"  Results saved to: {results_file}")

    # Generate HTML report
    report_file = output_dir / f"single_turn_report_{timestamp}.html"
    report_data = ReportData(
        summary=summary,
        results=[
            {
                "test_case_id": r.test_case_id,
                "category": r.category,
                "subcategory": r.subcategory,
                "input_message": r.input_message,
                "actual_output": r.actual_output,
                "expected_output": r.expected_output,
                "metrics": r.metrics,
                "passed": r.passed,
                "timestamp": r.timestamp,
                "duration_ms": r.duration_ms,
                "errors": r.errors
            }
            for r in results
        ],
        timestamp=datetime.now().isoformat()
    )
    generate_html_report(report_data, str(report_file))

    # Copy to latest
    shutil.copy(str(results_file), str(output_dir / "single_turn_results.json"))
    shutil.copy(str(report_file), str(output_dir / "single_turn_report.html"))

    return summary


async def run_multi_turn_evaluation(args, output_dir: Path, timestamp: str) -> dict:
    """Run multi-turn conversation evaluation"""

    print(f"\n[MULTI-TURN] Generating conversation test cases...")
    print("-" * 50)

    # Generate test cases
    test_cases = generate_all_multi_turn_test_cases()

    test_cases_file = output_dir / f"multi_turn_test_cases_{timestamp}.json"
    export_multi_turn_test_cases(test_cases, str(test_cases_file))

    print(f"  Generated {len(test_cases)} multi-turn test cases")
    print(f"  Saved to: {test_cases_file}")

    # Apply filters
    if args.category and args.category in MULTI_TURN_CATEGORIES:
        test_cases = [tc for tc in test_cases if tc.category == args.category]
        print(f"  Filtered to category '{args.category}': {len(test_cases)} cases")

    if args.quick:
        max_cases = args.max_cases or 10
        test_cases = test_cases[:max_cases]
        print(f"  Quick mode: limited to {len(test_cases)} conversations")
    elif args.max_cases:
        test_cases = test_cases[:args.max_cases]
        print(f"  Limited to {len(test_cases)} conversations")

    print(f"\n[MULTI-TURN] Running conversation evaluation...")
    print("-" * 50)

    # Initialize evaluator
    evaluator = MultiTurnEvaluator(chatbot_url=args.chatbot_url)

    # Run evaluation
    results = await evaluator.run_evaluation(
        test_cases=test_cases,
        verbose=args.verbose
    )

    # Export results
    results_file = output_dir / f"multi_turn_results_{timestamp}.json"
    evaluator.export_results(str(results_file))

    summary = evaluator.get_summary()
    print(f"\n  Multi-turn evaluation complete!")
    print(f"  Results saved to: {results_file}")

    # Generate HTML report for multi-turn
    report_file = output_dir / f"multi_turn_report_{timestamp}.html"
    generate_multi_turn_html_report(evaluator.results, summary, str(report_file))

    # Copy to latest
    shutil.copy(str(results_file), str(output_dir / "multi_turn_results.json"))
    shutil.copy(str(report_file), str(output_dir / "multi_turn_report.html"))

    return summary


def generate_multi_turn_html_report(results, summary, output_path: str):
    """Generate HTML report for multi-turn evaluation"""
    from dataclasses import asdict

    # Build conversation cards
    conversation_cards = ""
    for result in results:
        status_class = "passed" if result.overall_passed else "failed"
        status_icon = "" if result.overall_passed else ""

        # Build turns timeline
        turns_html = ""
        for turn in result.turns:
            turn_status = "" if not turn.validation_failed else ""
            turns_html += f"""
            <div class="turn">
                <div class="turn-header">
                    <span class="turn-number">Turn {turn.turn_number}</span>
                    <span class="turn-status">{turn_status}</span>
                    <span class="turn-duration">{turn.duration_ms:.0f}ms</span>
                </div>
                <div class="turn-user">
                    <strong>User:</strong> {turn.user_message[:100]}{'...' if len(turn.user_message) > 100 else ''}
                </div>
                <div class="turn-bot">
                    <strong>Bot:</strong> {turn.bot_response[:200]}{'...' if len(turn.bot_response) > 200 else ''}
                </div>
                <div class="turn-validation">
                    Passed: {len(turn.validation_passed)} | Failed: {len(turn.validation_failed)}
                </div>
            </div>
            """

        # Metrics display
        metrics_html = ""
        for metric, score in result.metrics.items():
            bar_width = int(score * 100)
            color = "#16a34a" if score >= 0.7 else ("#d97706" if score >= 0.5 else "#dc2626")
            metrics_html += f"""
            <div class="metric-row">
                <span class="metric-name">{metric}</span>
                <div class="metric-bar" style="width: 100px;">
                    <div class="metric-fill" style="width: {bar_width}%; background: {color};"></div>
                </div>
                <span class="metric-score">{score:.2f}</span>
            </div>
            """

        conversation_cards += f"""
        <div class="conversation-card {status_class}">
            <div class="card-header">
                <span class="status-icon">{status_icon}</span>
                <span class="test-id">{result.test_case_id}</span>
                <span class="test-name">{result.name}</span>
                <span class="category">{result.category}</span>
            </div>
            <div class="card-summary">
                <span>Turns: {result.completed_turns}/{result.total_turns}</span>
                <span>Workflow: {'Complete' if result.workflow_completed else 'Incomplete'}</span>
                <span>Ticket: {result.ticket_id or 'Not created'}</span>
                <span>Duration: {result.total_duration_ms:.0f}ms</span>
            </div>
            <div class="card-metrics">
                {metrics_html}
            </div>
            <details class="card-turns">
                <summary>View Conversation ({result.completed_turns} turns)</summary>
                <div class="turns-container">
                    {turns_html}
                </div>
            </details>
        </div>
        """

    # Build full HTML
    html_content = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>112 Call Center - Multi-Turn Evaluation Report</title>
    <style>
        :root {{
            --primary: #2563eb;
            --success: #16a34a;
            --warning: #d97706;
            --danger: #dc2626;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
        }}

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }}

        .container {{ max-width: 1200px; margin: 0 auto; padding: 2rem; }}

        header {{
            background: linear-gradient(135deg, #7c3aed, #5b21b6);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
        }}

        header h1 {{ font-size: 1.75rem; margin-bottom: 0.5rem; }}

        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }}

        .summary-card {{
            background: var(--card-bg);
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}

        .summary-card h3 {{ font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }}
        .summary-card .value {{ font-size: 1.75rem; font-weight: 700; color: var(--primary); }}

        .conversation-card {{
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-left: 4px solid var(--border);
        }}

        .conversation-card.passed {{ border-left-color: var(--success); }}
        .conversation-card.failed {{ border-left-color: var(--danger); }}

        .card-header {{
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }}

        .status-icon {{ font-size: 1.5rem; }}
        .test-id {{ font-family: monospace; color: var(--text-muted); }}
        .test-name {{ font-weight: 600; flex: 1; }}
        .category {{
            background: var(--primary);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
        }}

        .card-summary {{
            display: flex;
            gap: 2rem;
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-bottom: 1rem;
        }}

        .card-metrics {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.5rem;
            margin-bottom: 1rem;
        }}

        .metric-row {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
        }}

        .metric-name {{ width: 150px; color: var(--text-muted); }}
        .metric-bar {{ height: 6px; background: var(--border); border-radius: 3px; }}
        .metric-fill {{ height: 100%; border-radius: 3px; }}
        .metric-score {{ font-family: monospace; }}

        .card-turns summary {{
            cursor: pointer;
            color: var(--primary);
            font-weight: 500;
        }}

        .turns-container {{ margin-top: 1rem; }}

        .turn {{
            background: var(--bg);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.5rem;
        }}

        .turn-header {{
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            margin-bottom: 0.5rem;
        }}

        .turn-number {{ font-weight: 600; }}
        .turn-duration {{ color: var(--text-muted); }}

        .turn-user, .turn-bot {{
            font-size: 0.875rem;
            margin: 0.25rem 0;
        }}

        .turn-user {{ color: var(--primary); }}
        .turn-bot {{ color: var(--text); }}

        .turn-validation {{
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 0.5rem;
        }}

        footer {{ text-align: center; padding: 2rem; color: var(--text-muted); }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Multi-Turn Conversation Evaluation Report</h1>
            <p>Generated: {summary.get('evaluation_time', datetime.now().isoformat())}</p>
        </header>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Conversations</h3>
                <div class="value">{summary.get('total_conversations', 0)}</div>
            </div>
            <div class="summary-card">
                <h3>Pass Rate</h3>
                <div class="value">{summary.get('pass_rate', 0):.1f}%</div>
            </div>
            <div class="summary-card">
                <h3>Workflow Complete</h3>
                <div class="value">{summary.get('workflow_completion_rate', 0):.1f}%</div>
            </div>
            <div class="summary-card">
                <h3>Tickets Created</h3>
                <div class="value">{summary.get('ticket_creation_rate', 0):.1f}%</div>
            </div>
            <div class="summary-card">
                <h3>Avg Turns</h3>
                <div class="value">{summary.get('average_turns', 0):.1f}</div>
            </div>
            <div class="summary-card">
                <h3>Avg Duration</h3>
                <div class="value">{summary.get('average_duration_ms', 0)/1000:.1f}s</div>
            </div>
        </div>

        <h2 style="margin-bottom: 1rem;">Conversation Results</h2>

        {conversation_cards}

        <footer>
            <p>112 Call Center Agent - Multi-Turn Evaluation</p>
        </footer>
    </div>
</body>
</html>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"  Multi-turn report saved to: {output_path}")


async def run_full_evaluation(args) -> dict:
    """Run the complete evaluation pipeline"""

    mode = "multi" if args.multi_turn else ("all" if args.all else "single")
    print_banner(mode)

    # Setup output directory
    output_dir = setup_output_directory(args.output_dir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Check chatbot
    print("\n[SETUP] Checking chatbot connection...")
    print("-" * 50)
    if not check_chatbot_running(args.chatbot_url, args.force):
        return {"error": "Chatbot not running"}

    results = {}

    # Run single-turn evaluation
    if not args.multi_turn or args.all:
        results["single_turn"] = await run_single_turn_evaluation(args, output_dir, timestamp)

    # Run multi-turn evaluation
    if args.multi_turn or args.all:
        results["multi_turn"] = await run_multi_turn_evaluation(args, output_dir, timestamp)

    # Print final summary
    print(f"\n{'='*60}")
    print("FINAL EVALUATION SUMMARY")
    print(f"{'='*60}")

    if "single_turn" in results:
        st = results["single_turn"]
        print(f"\nSingle-Turn Evaluation:")
        print(f"  Test Cases: {st.get('total_test_cases', 0)}")
        print(f"  Pass Rate:  {st.get('pass_rate', 0):.1f}%")

    if "multi_turn" in results:
        mt = results["multi_turn"]
        print(f"\nMulti-Turn Evaluation:")
        print(f"  Conversations: {mt.get('total_conversations', 0)}")
        print(f"  Pass Rate:     {mt.get('pass_rate', 0):.1f}%")
        print(f"  Workflow Complete: {mt.get('workflow_completion_rate', 0):.1f}%")
        print(f"  Tickets Created:   {mt.get('ticket_creation_rate', 0):.1f}%")

    print(f"\n{'='*60}")
    print(f"\n Output Directory: {output_dir}")
    print(f" Open the HTML reports in a browser to view detailed results.")

    return results


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="112 Call Center Agent - Complete Evaluation Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_evaluation.py                    # Single-turn evaluation
  python run_evaluation.py --multi-turn       # Multi-turn conversation evaluation
  python run_evaluation.py --all              # Both single and multi-turn
  python run_evaluation.py --quick            # Quick evaluation
  python run_evaluation.py --category fire_emergency_flow --multi-turn
        """
    )

    # Evaluation mode
    parser.add_argument(
        "--multi-turn",
        action="store_true",
        help="Run multi-turn conversation evaluation instead of single-turn"
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Run both single-turn and multi-turn evaluations"
    )

    parser.add_argument(
        "--quick",
        action="store_true",
        help="Run quick evaluation with limited test cases"
    )

    parser.add_argument(
        "--category",
        type=str,
        default=None,
        help="Evaluate only specific category"
    )

    parser.add_argument(
        "--max-cases",
        type=int,
        default=None,
        help="Maximum number of test cases to run"
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default="./reports",
        help="Output directory for results and reports"
    )

    parser.add_argument(
        "--chatbot-url",
        type=str,
        default="http://localhost:5000",
        help="Chatbot API URL"
    )

    parser.add_argument(
        "--verbose",
        action="store_true",
        default=True,
        help="Show detailed output during evaluation"
    )

    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Minimal output"
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Force evaluation even if chatbot is not running"
    )

    parser.add_argument(
        "--list-categories",
        action="store_true",
        help="List available test categories and exit"
    )

    args = parser.parse_args()

    if args.list_categories:
        print_categories(multi_turn=False)
        print()
        print_categories(multi_turn=True)
        return

    if args.quiet:
        args.verbose = False

    # Run evaluation
    try:
        result = asyncio.run(run_full_evaluation(args))
        if isinstance(result, dict) and "error" in result:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nEvaluation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
