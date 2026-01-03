# 112 Call Center Agent - DeepEval Evaluation

Comprehensive evaluation system for the 112 Emergency Call Center AI Chatbot using the DeepEval framework.

## Overview

This evaluation system provides:
- **~1000 comprehensive test cases** covering all chatbot scenarios
- **Quantitative metrics** (Answer Relevancy, Faithfulness, Hallucination, Toxicity, Bias)
- **Qualitative metrics** (Custom G-Eval criteria for Vietnamese emergency services)
- **Interactive HTML reports** with charts and detailed analysis

## Quick Start

### 1. Install Dependencies

```bash
cd backend/tests/deepeval
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
# Required for DeepEval
export OPENAI_API_KEY="your-openai-api-key"

# Optional: Use specific model for evaluation
export DEEPEVAL_MODEL="gpt-4o"
```

### 3. Start the Chatbot Server

```bash
cd backend
npm run dev
```

### 4. Run Evaluation

```bash
# Full evaluation (~1000 test cases)
python run_evaluation.py

# Quick evaluation (10 test cases)
python run_evaluation.py --quick

# Specific category
python run_evaluation.py --category emergency_type_detection

# Custom settings
python run_evaluation.py --max-cases 100 --output-dir ./my_reports
```

## Test Categories

| Category | Description | Test Cases |
|----------|-------------|------------|
| `emergency_type_detection` | Fire, Medical, Security type detection | ~180 |
| `location_extraction` | Vietnamese address parsing | ~125 |
| `phone_validation` | Vietnamese phone number validation | ~120 |
| `affected_people` | Number of victims extraction | ~90 |
| `conversation_flow` | Multi-turn conversation handling | ~135 |
| `confirmation` | User confirmation/correction | ~60 |
| `first_aid_guidance` | RAG-based medical guidance | ~80 |
| `authenticated_user` | Logged-in user features | ~60 |
| `edge_cases` | Security and error handling | ~120 |
| `language_variations` | Vietnamese dialects/slang | ~100 |

## Metrics

### Quantitative Metrics (DeepEval Built-in)

| Metric | Description | Threshold |
|--------|-------------|-----------|
| Answer Relevancy | Response relevance to input | 0.7 |
| Faithfulness | Grounded in context | 0.7 |
| Hallucination | Fabricated information detection | 0.3 |
| Toxicity | Harmful content detection | 0.1 |
| Bias | Biased response detection | 0.1 |

### Qualitative Metrics (Custom G-Eval)

| Metric | Description | Threshold |
|--------|-------------|-----------|
| Emergency Type Accuracy | Correct type classification | 0.7 |
| Location Extraction Quality | Address parsing accuracy | 0.7 |
| Phone Validation Accuracy | Vietnamese phone validation | 0.7 |
| Conversation Flow Quality | Flow adherence | 0.7 |
| First Aid Guidance Quality | Medical guidance accuracy | 0.7 |
| Confirmation Handling | Confirm/correct detection | 0.7 |
| Vietnamese Language Quality | Dialect/slang handling | 0.7 |
| Safety & Security | Input sanitization | 0.9 |

## Output Files

After running evaluation, you'll find:

```
reports/
├── evaluation_results_TIMESTAMP.json    # Raw results
├── evaluation_report_TIMESTAMP.html     # Detailed HTML report
├── test_cases_TIMESTAMP.json            # Generated test cases
├── evaluation_results.json              # Latest results
└── evaluation_report.html               # Latest report
```

## HTML Report Features

The generated HTML report includes:

- **Summary Dashboard**: Pass/fail statistics, overall scores
- **Interactive Charts**:
  - Pass/Fail distribution (donut chart)
  - Category performance (bar chart)
  - Metric scores (radar chart)
  - Test duration distribution (histogram)
- **Category Breakdown**: Performance per test category
- **Metric Analysis**: Detailed metric scores
- **Test Results Table**:
  - Filterable by status (passed/failed)
  - Searchable by test ID or content
  - Sortable columns
  - Error details

## Project Structure

```
backend/tests/deepeval/
├── __init__.py              # Module exports
├── config.py                # Configuration settings
├── test_cases_generator.py  # Test case generation (~1000 cases)
├── evaluation.py            # Main evaluation logic
├── report_generator.py      # HTML report generation
├── run_evaluation.py        # Complete pipeline runner
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Command Line Options

```bash
python run_evaluation.py --help

Options:
  --quick              Run quick evaluation (10 cases)
  --category CATEGORY  Evaluate specific category
  --max-cases N        Limit to N test cases
  --output-dir PATH    Output directory for reports
  --chatbot-url URL    Chatbot API URL (default: http://localhost:5000)
  --verbose            Show detailed output
  --quiet              Minimal output
  --force              Force run even if chatbot not responding
  --list-categories    Show available categories
```

## Programmatic Usage

```python
import asyncio
from deepeval import Evaluator, generate_all_test_cases

async def run_evaluation():
    # Generate test cases
    test_cases = generate_all_test_cases()

    # Initialize evaluator
    evaluator = Evaluator(chatbot_url="http://localhost:5000")

    # Run evaluation
    results = await evaluator.run_evaluation(
        test_cases=test_cases,
        categories=["emergency_type_detection"],
        max_cases=100,
        verbose=True
    )

    # Get summary
    summary = evaluator.get_summary()
    print(f"Pass Rate: {summary['pass_rate']:.1f}%")

    # Export results
    evaluator.export_results("results.json")

asyncio.run(run_evaluation())
```

## Custom Test Cases

You can add custom test cases:

```python
from test_cases_generator import TestCase

custom_case = TestCase(
    id="CUSTOM_001",
    category="emergency_type_detection",
    subcategory="fire",
    input_message="Nhà tôi đang cháy lớn!",
    expected_output="Should detect FIRE_RESCUE",
    context=[],
    expected_extraction={"emergencyTypes": ["FIRE_RESCUE"]},
    metadata={"custom": True}
)
```

## Troubleshooting

### Chatbot not responding
```bash
# Make sure backend is running
cd backend && npm run dev

# Or use --force to continue anyway
python run_evaluation.py --force
```

### OpenAI API errors
```bash
# Check API key
echo $OPENAI_API_KEY

# Set it if missing
export OPENAI_API_KEY="sk-..."
```

### Memory issues with large evaluations
```bash
# Run in batches
python run_evaluation.py --category emergency_type_detection
python run_evaluation.py --category location_extraction
# etc.
```

## Contributing

To add new test cases:

1. Edit `test_cases_generator.py`
2. Add scenarios to the appropriate generator function
3. Run `python run_evaluation.py --quick` to test
4. Submit PR with new test cases

## License

Part of the 112 Call Center Agent project.
