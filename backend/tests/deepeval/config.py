"""
DeepEval Configuration for 112 Call Center Agent Evaluation
============================================================

This module contains configuration settings for the DeepEval evaluation framework.
"""

import os
from dataclasses import dataclass
from typing import List, Dict, Any

# API Configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4-turbo-preview")

# Evaluation Model Configuration
EVALUATION_MODEL = "gpt-4o"  # Model used for evaluation metrics

# Thresholds for metrics
@dataclass
class MetricThresholds:
    """Threshold values for various metrics"""
    answer_relevancy: float = 0.7
    faithfulness: float = 0.7
    contextual_precision: float = 0.6
    contextual_recall: float = 0.6
    hallucination: float = 0.3  # Lower is better
    toxicity: float = 0.1  # Lower is better
    bias: float = 0.1  # Lower is better
    g_eval: float = 0.7

THRESHOLDS = MetricThresholds()

# Emergency Types
EMERGENCY_TYPES = ["FIRE_RESCUE", "MEDICAL", "SECURITY"]

# Emergency Type Keywords (Vietnamese)
EMERGENCY_KEYWORDS = {
    "FIRE_RESCUE": [
        "cháy", "lửa", "khói", "nổ", "mắc kẹt", "đuối nước", "sập",
        "cháy rừng", "cháy nhà", "cháy xe", "cháy xưởng", "hỏa hoạn",
        "bốc cháy", "ngọn lửa", "cứu hỏa", "chập điện", "rò rỉ gas"
    ],
    "MEDICAL": [
        "tai nạn", "bị thương", "chảy máu", "bất tỉnh", "ngất", "đau tim",
        "đột quỵ", "co giật", "khó thở", "ngộ độc", "đau ngực", "gãy xương",
        "bỏng", "điện giật", "rắn cắn", "ngưng tim", "cấp cứu", "nghẹt thở",
        "trúng gió", "sốc", "dị ứng", "sốc phản vệ", "xuất huyết"
    ],
    "SECURITY": [
        "trộm", "cướp", "đột nhập", "ăn trộm", "đánh nhau", "hành hung",
        "gây rối", "giết người", "đâm", "bắn", "đe dọa", "bạo lực gia đình",
        "bắt cóc", "khủng bố", "gây thương tích", "quấy rối", "say xỉn gây rối",
        "đua xe", "côn đồ", "tụ tập gây rối"
    ]
}

# Vietnamese Phone Number Prefixes (Valid)
VALID_PHONE_PREFIXES = [
    "090", "091", "092", "093", "094", "096", "097", "098", "099",
    "032", "033", "034", "035", "036", "037", "038", "039",
    "070", "076", "077", "078", "079",
    "081", "082", "083", "084", "085", "086", "088", "089",
    "052", "053", "054", "055", "056", "058", "059"
]

# Vietnamese Location Keywords
LOCATION_KEYWORDS = {
    "address_indicators": ["số", "đường", "phố", "ngõ", "hẻm", "ngách", "khu phố"],
    "ward_indicators": ["phường", "xã", "thị trấn"],
    "district_indicators": ["quận", "huyện", "thị xã"],
    "city_indicators": ["thành phố", "tp", "tỉnh", "tphcm", "hcm", "hà nội", "đà nẵng"]
}

# Cities in Vietnam
MAJOR_CITIES = [
    "Thành phố Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
    "Biên Hòa", "Nha Trang", "Huế", "Buôn Ma Thuột", "Đà Lạt",
    "Quy Nhơn", "Vũng Tàu", "Long Xuyên", "Thái Nguyên", "Nam Định"
]

# Sample Districts in HCMC
HCMC_DISTRICTS = [
    "Quận 1", "Quận 2", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7",
    "Quận 8", "Quận 9", "Quận 10", "Quận 11", "Quận 12", "Quận Bình Thạnh",
    "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú",
    "Quận Thủ Đức", "Huyện Bình Chánh", "Huyện Củ Chi", "Huyện Hóc Môn",
    "Huyện Nhà Bè", "Thành phố Thủ Đức"
]

# Confirmation Keywords
CONFIRMATION_KEYWORDS = {
    "positive": ["đúng", "xác nhận", "ok", "yes", "đúng rồi", "chính xác",
                 "đồng ý", "oke", "ừ", "uh", "vâng", "được", "chuẩn"],
    "negative": ["không", "sai", "nhầm", "không phải", "chưa đúng", "sửa",
                 "thay đổi", "không đúng", "xin lỗi", "sorry", "chỉnh",
                 "đổi", "khác", "không chính xác", "cập nhật", "thực ra"]
}

# Support Types
SUPPORT_TYPES = {
    "police": "Công an",
    "ambulance": "Xe cấp cứu",
    "fireDepartment": "Xe cứu hỏa",
    "rescue": "Đội cứu hộ"
}

# Priority Levels
PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# Test Categories
TEST_CATEGORIES = [
    "emergency_type_detection",
    "location_extraction",
    "phone_validation",
    "affected_people",
    "conversation_flow",
    "confirmation",
    "user_correction",
    "first_aid_guidance",
    "authenticated_user",
    "ticket_query",
    "edge_cases",
    "multi_turn",
    "language_variations",
    "urgency_detection",
    "error_handling"
]

# Report Configuration
REPORT_CONFIG = {
    "title": "112 Call Center Agent - DeepEval Evaluation Report",
    "output_dir": "./reports",
    "output_filename": "evaluation_report.html",
    "include_test_cases": True,
    "include_metrics": True,
    "include_summary": True,
    "include_charts": True
}
