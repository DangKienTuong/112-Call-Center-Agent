"""
112 Call Center Agent - HTML Report Generator
===============================================

This module generates comprehensive HTML reports from DeepEval evaluation results.

Features:
- Interactive dashboard with charts
- Detailed test case results
- Category-wise breakdown
- Metric analysis
- Export functionality
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass


@dataclass
class ReportData:
    """Data structure for report generation"""
    summary: Dict[str, Any]
    results: List[Dict[str, Any]]
    timestamp: str


def load_evaluation_results(filepath: str = "evaluation_results.json") -> ReportData:
    """Load evaluation results from JSON file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return ReportData(
        summary=data.get("summary", {}),
        results=data.get("results", []),
        timestamp=data.get("summary", {}).get("evaluation_time", datetime.now().isoformat())
    )


def generate_html_report(
    data: ReportData,
    output_path: str = "evaluation_report.html"
) -> str:
    """Generate comprehensive HTML report"""

    # Calculate statistics
    total = data.summary.get("total_test_cases", 0)
    passed = data.summary.get("passed", 0)
    failed = data.summary.get("failed", 0)
    pass_rate = data.summary.get("pass_rate", 0)
    avg_metrics = data.summary.get("average_metrics", {})
    category_rates = data.summary.get("category_pass_rates", {})

    # No chart data generation needed for simplified report

    # Generate test results table rows with expandable details
    results_rows = ""
    for idx, result in enumerate(data.results):
        status_class = "passed" if result.get("passed") else "failed"
        status_icon = "✅" if result.get("passed") else "❌"
        metrics_str = ", ".join([
            f"{k}: {v:.2f}" for k, v in result.get("metrics", {}).items()
        ])
        errors_str = "; ".join(result.get("errors", [])) or "None"
        
        # Escape HTML characters in messages
        input_msg = result.get('input_message', '').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
        actual_output = result.get('actual_output', '').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')
        expected_output = result.get('expected_output', '').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')

        results_rows += f"""
        <tr class="result-row {status_class}" onclick="toggleDetails('details-{idx}')">
            <td class="status-cell">{status_icon}</td>
            <td><code>{result.get('test_case_id', 'N/A')}</code></td>
            <td><span class="category-badge">{result.get('category', 'N/A')}</span></td>
            <td><span class="subcategory-text">{result.get('subcategory', 'N/A')}</span></td>
            <td class="input-cell" title="{input_msg[:200]}">{input_msg[:50]}...</td>
            <td class="metrics-cell">{metrics_str}</td>
            <td class="duration-cell">{result.get('duration_ms', 0):.0f}ms</td>
            <td class="expand-cell">👁️ View</td>
        </tr>
        <tr id="details-{idx}" class="details-row" style="display: none;">
            <td colspan="8">
                <div class="details-content">
                    <div class="detail-section">
                        <h4>📝 Input Message:</h4>
                        <div class="detail-text">{input_msg}</div>
                    </div>
                    <div class="detail-section">
                        <h4>🤖 Actual Chatbot Response:</h4>
                        <div class="detail-text response-text">{actual_output}</div>
                    </div>
                    <div class="detail-section">
                        <h4>✓ Expected Output:</h4>
                        <div class="detail-text">{expected_output}</div>
                    </div>
                    <div class="detail-section">
                        <h4>📊 Metrics:</h4>
                        <div class="detail-text">{metrics_str}</div>
                    </div>
                    {f'<div class="detail-section error-section"><h4>⚠️ Errors:</h4><div class="detail-text">{errors_str}</div></div>' if result.get('errors') else ''}
                </div>
            </td>
        </tr>
        """

    # Generate metric summary cards - ONLY 2 core metrics
    core_metrics = ["Emergency Type Accuracy", "Answer Relevancy"]
    metric_cards = ""
    for metric, value in avg_metrics.items():
        # Only show the 2 core metrics
        if metric not in core_metrics:
            continue
            
        score_pct = value * 100
        color_class = "success" if score_pct >= 70 else ("warning" if score_pct >= 50 else "danger")
        
        # Add emoji for each metric
        emoji = "🎯" if metric == "Emergency Type Accuracy" else "💬"
        
        metric_cards += f"""
        <div class="metric-card {color_class}">
            <h4>{emoji} {metric}</h4>
            <div class="score">{score_pct:.1f}%</div>
            <div class="bar">
                <div class="bar-fill" style="width: {score_pct}%"></div>
            </div>
        </div>
        """

    html_content = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>112 Call Center Agent - Evaluation Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }}

        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }}

        header {{
            background: linear-gradient(135deg, var(--primary), #1d4ed8);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }}

        header h1 {{
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }}

        header p {{
            opacity: 0.9;
        }}

        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}

        .summary-card {{
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            text-align: center;
        }}

        .summary-card h3 {{
            font-size: 0.875rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }}

        .summary-card .value {{
            font-size: 2.5rem;
            font-weight: 700;
        }}

        .summary-card.success .value {{ color: var(--success); }}
        .summary-card.warning .value {{ color: var(--warning); }}
        .summary-card.danger .value {{ color: var(--danger); }}
        .summary-card.primary .value {{ color: var(--primary); }}

        .charts-section {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }}

        .chart-card {{
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }}

        .chart-card h3 {{
            margin-bottom: 1rem;
            color: var(--text);
        }}

        .section {{
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }}

        .section h2 {{
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid var(--border);
        }}

        .metric-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }}

        .category-card, .metric-card {{
            background: var(--bg);
            border-radius: 8px;
            padding: 1rem;
            border-left: 4px solid;
        }}

        .category-card.success, .metric-card.success {{ border-left-color: var(--success); }}
        .category-card.warning, .metric-card.warning {{ border-left-color: var(--warning); }}
        .category-card.danger, .metric-card.danger {{ border-left-color: var(--danger); }}

        .category-card h4, .metric-card h4 {{
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
        }}

        .category-card .rate, .metric-card .score {{
            font-size: 1.5rem;
            font-weight: 700;
        }}

        .bar {{
            height: 6px;
            background: var(--border);
            border-radius: 3px;
            margin-top: 0.5rem;
            overflow: hidden;
        }}

        .bar-fill {{
            height: 100%;
            background: var(--primary);
            border-radius: 3px;
            transition: width 0.3s ease;
        }}

        .results-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }}

        .results-table th {{
            background: var(--bg);
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid var(--border);
            position: sticky;
            top: 0;
        }}

        .results-table td {{
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
        }}

        .results-table .result-row:hover {{
            background: var(--bg);
        }}

        .results-table .result-row.passed {{
            background: rgba(22, 163, 74, 0.05);
        }}

        .results-table .result-row.failed {{
            background: rgba(220, 38, 38, 0.05);
        }}

        .status-cell {{
            font-size: 1.25rem;
            text-align: center;
        }}

        .category-badge {{
            background: var(--primary);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            text-transform: uppercase;
        }}

        .subcategory-text {{
            color: var(--text-muted);
            font-size: 0.75rem;
        }}

        .input-cell {{
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }}

        .metrics-cell {{
            font-family: monospace;
            font-size: 0.75rem;
            color: var(--text-muted);
        }}

        .duration-cell {{
            text-align: right;
            font-family: monospace;
        }}

        .errors-cell {{
            color: var(--danger);
            font-size: 0.75rem;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
        }}

        .expand-cell {{
            text-align: center;
            cursor: pointer;
            color: var(--primary);
            font-size: 0.875rem;
        }}

        .expand-cell:hover {{
            color: var(--primary);
            text-decoration: underline;
        }}

        .details-row {{
            background: var(--bg) !important;
        }}

        .details-content {{
            padding: 1.5rem;
            border-left: 4px solid var(--primary);
        }}

        .detail-section {{
            margin-bottom: 1.5rem;
        }}

        .detail-section:last-child {{
            margin-bottom: 0;
        }}

        .detail-section h4 {{
            font-size: 0.875rem;
            color: var(--text);
            margin-bottom: 0.5rem;
            font-weight: 600;
        }}

        .detail-text {{
            background: var(--card-bg);
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid var(--border);
            font-size: 0.875rem;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }}

        .response-text {{
            background: #f0f9ff;
            border-color: var(--primary);
        }}

        .error-section .detail-text {{
            background: #fef2f2;
            border-color: var(--danger);
            color: var(--danger);
        }}

        .result-row {{
            cursor: pointer;
            transition: all 0.2s;
        }}

        .table-container {{
            max-height: 800px;
            overflow-y: auto;
            border-radius: 8px;
            border: 1px solid var(--border);
        }}

        .filters {{
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }}

        .filter-btn {{
            padding: 0.5rem 1rem;
            border: 1px solid var(--border);
            background: var(--card-bg);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }}

        .filter-btn:hover, .filter-btn.active {{
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }}

        .search-box {{
            padding: 0.5rem 1rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            width: 300px;
        }}

        footer {{
            text-align: center;
            padding: 2rem;
            color: var(--text-muted);
        }}

        @media (max-width: 768px) {{
            .container {{
                padding: 1rem;
            }}

            .charts-section {{
                grid-template-columns: 1fr;
            }}

            .table-container {{
                overflow-x: auto;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>112 Call Center Agent - Evaluation Report</h1>
            <p>DeepEval Comprehensive Evaluation | Generated: {data.timestamp}</p>
        </header>

        <!-- Metric Analysis - Only 2 Core Metrics -->
        <div class="section">
            <h2>📊 Metric Analysis</h2>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
                Evaluation based on 2 core metrics: Emergency Type Accuracy and Answer Relevancy
            </p>
            <div class="metric-grid">
                {metric_cards}
            </div>
        </div>

        <!-- Test Duration Distribution Chart -->
        <div class="section">
            <h2>⏱️ Test Duration Distribution</h2>
            <div class="chart-card">
                <canvas id="durationChart"></canvas>
            </div>
        </div>

        <!-- Detailed Results -->
        <div class="section">
            <h2>📋 Detailed Test Results</h2>

            <div class="filters">
                <button class="filter-btn active" onclick="filterResults('all')">All</button>
                <button class="filter-btn" onclick="filterResults('passed')">Passed</button>
                <button class="filter-btn" onclick="filterResults('failed')">Failed</button>
                <input type="text" class="search-box" placeholder="Search test cases..." onkeyup="searchResults(this.value)">
            </div>

            <div class="table-container">
                <table class="results-table" id="resultsTable">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Test ID</th>
                            <th>Category</th>
                            <th>Subcategory</th>
                            <th>Input</th>
                            <th>Metrics</th>
                            <th>Duration</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results_rows}
                    </tbody>
                </table>
            </div>
        </div>

        <footer>
            <p>Generated by 112 Call Center Agent Evaluation System</p>
            <p>Using DeepEval Framework | Total Metrics: {len(avg_metrics)}</p>
        </footer>
    </div>

    <script>
        // Duration Distribution Chart
        const durations = {json.dumps([r.get('duration_ms', 0) for r in data.results])};
        const durationBins = [0, 5000, 10000, 15000, 20000, 30000, 50000];
        const durationCounts = new Array(durationBins.length - 1).fill(0);

        durations.forEach(d => {{
            for (let i = 0; i < durationBins.length - 1; i++) {{
                if (d >= durationBins[i] && d < durationBins[i + 1]) {{
                    durationCounts[i]++;
                    break;
                }}
            }}
        }});

        new Chart(document.getElementById('durationChart'), {{
            type: 'bar',
            data: {{
                labels: ['<5s', '5-10s', '10-15s', '15-20s', '20-30s', '30-50s'],
                datasets: [{{
                    label: 'Number of Test Cases',
                    data: durationCounts,
                    backgroundColor: '#2563eb',
                    borderRadius: 8
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: true,
                scales: {{
                    y: {{
                        beginAtZero: true,
                        ticks: {{
                            stepSize: 10
                        }}
                    }}
                }},
                plugins: {{
                    legend: {{
                        display: true,
                        position: 'top'
                    }},
                    title: {{
                        display: true,
                        text: 'Distribution of test execution times',
                        font: {{
                            size: 14
                        }}
                    }}
                }}
            }}
        }});

        // Filter functionality
        function filterResults(filter) {{
            const rows = document.querySelectorAll('.result-row:not(.details-row)');
            const buttons = document.querySelectorAll('.filter-btn');

            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            rows.forEach(row => {{
                if (filter === 'all') {{
                    row.style.display = '';
                }} else if (filter === 'passed') {{
                    row.style.display = row.classList.contains('passed') ? '' : 'none';
                }} else if (filter === 'failed') {{
                    row.style.display = row.classList.contains('failed') ? '' : 'none';
                }}
            }});
        }}

        // Search functionality
        function searchResults(query) {{
            const rows = document.querySelectorAll('.result-row:not(.details-row)');
            const lowerQuery = query.toLowerCase();

            rows.forEach(row => {{
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(lowerQuery) ? '' : 'none';
            }});
        }}

        // Toggle details row
        function toggleDetails(detailsId) {{
            const detailsRow = document.getElementById(detailsId);
            if (detailsRow.style.display === 'none') {{
                detailsRow.style.display = 'table-row';
            }} else {{
                detailsRow.style.display = 'none';
            }}
        }}
    </script>
</body>
</html>
"""

    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"HTML report generated: {output_path}")
    return output_path


def main():
    """Main entry point for report generation"""
    import argparse

    parser = argparse.ArgumentParser(description="Generate HTML report from evaluation results")
    parser.add_argument(
        "--input",
        type=str,
        default="evaluation_results.json",
        help="Input JSON file with evaluation results"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="evaluation_report.html",
        help="Output HTML file path"
    )

    args = parser.parse_args()

    # Load results
    print(f"Loading evaluation results from {args.input}...")
    data = load_evaluation_results(args.input)

    # Generate report
    print("Generating HTML report...")
    output_path = generate_html_report(data, args.output)

    print(f"\nReport generated successfully!")
    print(f"Open {output_path} in a browser to view the report.")


if __name__ == "__main__":
    main()
