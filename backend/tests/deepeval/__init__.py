"""
112 Call Center Agent - DeepEval Evaluation Module
===================================================

This module provides comprehensive evaluation of the 112 emergency call center
AI chatbot using the DeepEval framework.

Modules:
    - config: Configuration settings and thresholds
    - test_cases_generator: Generates ~1000 test cases
    - evaluation: Main evaluation logic with metrics
    - report_generator: HTML report generation
    - run_evaluation: Complete evaluation pipeline

Usage:
    # From command line
    python run_evaluation.py

    # From Python
    from deepeval import Evaluator
    evaluator = Evaluator()
    results = await evaluator.run_evaluation(test_cases)

Test Categories:
    - emergency_type_detection: Fire, Medical, Security detection
    - location_extraction: Address parsing and extraction
    - phone_validation: Vietnamese phone number validation
    - affected_people: Number of victims/injured extraction
    - conversation_flow: Multi-turn conversation handling
    - confirmation: User confirmation/correction handling
    - first_aid_guidance: RAG-based medical guidance
    - authenticated_user: Logged-in user features
    - edge_cases: Error handling and security
    - language_variations: Vietnamese dialect/slang handling

Metrics Used:
    Quantitative:
        - Answer Relevancy
        - Faithfulness
        - Hallucination Detection
        - Toxicity Detection
        - Bias Detection

    Qualitative (Custom G-Eval):
        - Emergency Type Accuracy
        - Location Extraction Quality
        - Phone Validation Accuracy
        - Conversation Flow Quality
        - First Aid Guidance Quality
        - Confirmation Handling
        - Vietnamese Language Quality
        - Safety & Security
"""

__version__ = "1.0.0"
__author__ = "112 Call Center Team"

from .config import THRESHOLDS, EVALUATION_MODEL, TEST_CATEGORIES
from .test_cases_generator import generate_all_test_cases, TestCase
from .evaluation import Evaluator, EvaluationResult
from .report_generator import generate_html_report, ReportData

__all__ = [
    "THRESHOLDS",
    "EVALUATION_MODEL",
    "TEST_CATEGORIES",
    "generate_all_test_cases",
    "TestCase",
    "Evaluator",
    "EvaluationResult",
    "generate_html_report",
    "ReportData",
]
