"""
Multi-Turn Conversation Test Cases for 112 Call Center Agent
=============================================================

This module generates test cases for complete multi-turn conversations,
testing the entire workflow from initial contact to ticket creation.

Complete Workflow:
1. User reports emergency (emergency type detection)
2. System provides first aid guidance
3. System asks for location
4. User provides location
5. System asks for phone (skip if authenticated with saved phone)
6. User provides phone
7. System asks for affected people count
8. User provides count
9. System shows confirmation
10. User confirms
11. System creates ticket and shows result

Test Scenarios:
- Complete fire emergency flow
- Complete medical emergency flow
- Complete security emergency flow
- Multi-type emergency flow
- User correction during flow
- Authenticated user flow (skip phone)
- Incomplete/abandoned flows
- Edge cases in conversation
"""

import random
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from config import VALID_PHONE_PREFIXES, HCMC_DISTRICTS, EMERGENCY_TYPES


@dataclass
class ConversationTurn:
    """A single turn in a conversation"""
    user_message: str
    expected_bot_actions: List[str]  # What the bot should do
    expected_extractions: Dict[str, Any]  # What should be extracted
    expected_next_step: str  # What step should come next
    validation_criteria: List[str]  # Criteria to validate response


@dataclass
class MultiTurnTestCase:
    """Complete multi-turn conversation test case"""
    id: str
    name: str
    description: str
    category: str
    turns: List[ConversationTurn]
    expected_final_state: Dict[str, Any]
    is_authenticated: bool = False
    user_memory: Optional[Dict[str, Any]] = None
    should_create_ticket: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


def generate_phone() -> str:
    """Generate a valid Vietnamese phone number"""
    prefix = random.choice(VALID_PHONE_PREFIXES)
    suffix = str(random.randint(1000000, 9999999))
    return f"{prefix}{suffix}"


def generate_address() -> Dict[str, str]:
    """Generate a Vietnamese address"""
    street_number = random.randint(1, 500)
    streets = ["Nguyễn Huệ", "Lê Lợi", "Trần Hưng Đạo", "Nguyễn Trãi", "Võ Văn Tần",
               "Điện Biên Phủ", "Cách Mạng Tháng 8", "Hai Bà Trưng", "Lý Tự Trọng"]
    street = random.choice(streets)
    ward = f"Phường {random.randint(1, 15)}"
    district = random.choice(HCMC_DISTRICTS)

    return {
        "full": f"{street_number} {street}, {ward}, {district}, TP.HCM",
        "address": f"{street_number} {street}",
        "ward": ward,
        "district": district,
        "city": "Thành phố Hồ Chí Minh"
    }


# =============================================================================
# COMPLETE WORKFLOW TEST CASES
# =============================================================================

def generate_fire_emergency_flows() -> List[MultiTurnTestCase]:
    """Generate complete fire emergency conversation flows"""
    test_cases = []

    # Flow 1: Standard fire emergency - complete flow
    addr = generate_address()
    phone = generate_phone()
    test_cases.append(MultiTurnTestCase(
        id="MULTI_FIRE_001",
        name="Complete Fire Emergency Flow",
        description="Standard fire emergency from report to ticket creation",
        category="fire_emergency_flow",
        turns=[
            ConversationTurn(
                user_message="Cháy nhà! Nhà tôi đang cháy lớn lắm!",
                expected_bot_actions=["detect_emergency_type", "provide_first_aid"],
                expected_extractions={"emergencyTypes": ["FIRE_RESCUE"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=[
                    "Should detect FIRE_RESCUE emergency",
                    "Should provide fire safety guidance",
                    "Should ask for location"
                ]
            ),
            ConversationTurn(
                user_message=addr["full"],
                expected_bot_actions=["extract_location", "ask_phone"],
                expected_extractions={"location": {"address": addr["address"], "ward": addr["ward"]}},
                expected_next_step="phone",
                validation_criteria=[
                    "Should extract complete address",
                    "Should ask for phone number"
                ]
            ),
            ConversationTurn(
                user_message=phone,
                expected_bot_actions=["validate_phone", "ask_people"],
                expected_extractions={"phone": phone},
                expected_next_step="people",
                validation_criteria=[
                    "Should validate phone number",
                    "Should ask for number of affected people"
                ]
            ),
            ConversationTurn(
                user_message="3 người trong nhà",
                expected_bot_actions=["extract_people_count", "show_confirmation"],
                expected_extractions={"affectedPeople": {"total": 3}},
                expected_next_step="confirmation",
                validation_criteria=[
                    "Should extract 3 people",
                    "Should show confirmation summary"
                ]
            ),
            ConversationTurn(
                user_message="Đúng rồi, xác nhận",
                expected_bot_actions=["create_ticket", "provide_final_guidance"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=[
                    "Should create emergency ticket",
                    "Should show ticket ID",
                    "Should confirm dispatch"
                ]
            ),
        ],
        expected_final_state={
            "emergencyTypes": ["FIRE_RESCUE"],
            "location": addr,
            "phone": phone,
            "affectedPeople": {"total": 3},
            "ticketCreated": True
        },
        should_create_ticket=True,
        metadata={"emergency_type": "FIRE_RESCUE", "complexity": "standard"}
    ))

    # Flow 2: Fire with trapped people (more urgent)
    addr = generate_address()
    phone = generate_phone()
    test_cases.append(MultiTurnTestCase(
        id="MULTI_FIRE_002",
        name="Fire with Trapped People",
        description="Fire emergency with people trapped inside",
        category="fire_emergency_flow",
        turns=[
            ConversationTurn(
                user_message="Cháy lớn! Có người mắc kẹt trong nhà không ra được!",
                expected_bot_actions=["detect_emergency_type", "detect_multiple_types", "provide_first_aid"],
                expected_extractions={"emergencyTypes": ["FIRE_RESCUE", "MEDICAL"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=[
                    "Should detect FIRE_RESCUE and MEDICAL",
                    "Should provide urgent guidance",
                    "Should ask for location immediately"
                ]
            ),
            ConversationTurn(
                user_message=f"{addr['address']}, {addr['ward']}, {addr['district']}",
                expected_bot_actions=["extract_location", "ask_phone"],
                expected_extractions={"location": {"address": addr["address"]}},
                expected_next_step="phone",
                validation_criteria=["Should extract location", "Should ask for phone"]
            ),
            ConversationTurn(
                user_message=f"Số tôi là {phone}",
                expected_bot_actions=["validate_phone", "ask_people"],
                expected_extractions={"phone": phone},
                expected_next_step="people",
                validation_criteria=["Should validate phone", "Should ask about trapped people"]
            ),
            ConversationTurn(
                user_message="5 người, 2 người mắc kẹt tầng 3",
                expected_bot_actions=["extract_people_count", "show_confirmation"],
                expected_extractions={"affectedPeople": {"total": 5}},
                expected_next_step="confirmation",
                validation_criteria=["Should extract 5 people", "Should show confirmation"]
            ),
            ConversationTurn(
                user_message="Xác nhận",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create urgent ticket", "Should dispatch fire and rescue"]
            ),
        ],
        expected_final_state={
            "emergencyTypes": ["FIRE_RESCUE", "MEDICAL"],
            "ticketCreated": True,
            "priority": "CRITICAL"
        },
        metadata={"emergency_type": "FIRE_RESCUE", "complexity": "urgent", "trapped_people": True}
    ))

    # Flow 3: Fire with partial information requiring clarification
    addr = generate_address()
    phone = generate_phone()
    test_cases.append(MultiTurnTestCase(
        id="MULTI_FIRE_003",
        name="Fire with Partial Location",
        description="Fire emergency where location needs clarification",
        category="fire_emergency_flow",
        turns=[
            ConversationTurn(
                user_message="Có cháy ở đây!",
                expected_bot_actions=["detect_emergency_type", "ask_details"],
                expected_extractions={"emergencyTypes": ["FIRE_RESCUE"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=["Should detect fire", "Should ask for location"]
            ),
            ConversationTurn(
                user_message="Gần chợ Bến Thành",  # Partial location
                expected_bot_actions=["extract_partial_location", "ask_clarification"],
                expected_extractions={"location": {"landmarks": "Gần chợ Bến Thành"}},
                expected_next_step="location_clarification",
                validation_criteria=["Should extract landmark", "Should ask for specific address"]
            ),
            ConversationTurn(
                user_message=addr["full"],  # Full address
                expected_bot_actions=["extract_location", "ask_phone"],
                expected_extractions={"location": {"address": addr["address"]}},
                expected_next_step="phone",
                validation_criteria=["Should extract full address", "Should ask for phone"]
            ),
            ConversationTurn(
                user_message=phone,
                expected_bot_actions=["validate_phone", "ask_people"],
                expected_extractions={"phone": phone},
                expected_next_step="people",
                validation_criteria=["Should validate phone"]
            ),
            ConversationTurn(
                user_message="1 người",
                expected_bot_actions=["extract_people_count", "show_confirmation"],
                expected_extractions={"affectedPeople": {"total": 1}},
                expected_next_step="confirmation",
                validation_criteria=["Should extract count"]
            ),
            ConversationTurn(
                user_message="OK",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket"]
            ),
        ],
        expected_final_state={"ticketCreated": True},
        metadata={"requires_clarification": True}
    ))

    # Generate more fire flows with variations
    for i in range(7):
        addr = generate_address()
        phone = generate_phone()
        people_count = random.randint(1, 10)

        fire_descriptions = [
            "Cháy nhà bếp, lửa lan nhanh!",
            "Chập điện gây cháy phòng ngủ!",
            "Bình gas phát nổ, cháy lớn!",
            "Cháy kho hàng, khói đen nhiều!",
            "Xe ô tô bốc cháy trong garage!",
            "Cháy tầng hầm chung cư!",
            "Cháy do đốt vàng mã!",
        ]

        test_cases.append(MultiTurnTestCase(
            id=f"MULTI_FIRE_{i+4:03d}",
            name=f"Fire Emergency Variation {i+1}",
            description=fire_descriptions[i],
            category="fire_emergency_flow",
            turns=[
                ConversationTurn(
                    user_message=fire_descriptions[i],
                    expected_bot_actions=["detect_emergency_type"],
                    expected_extractions={"emergencyTypes": ["FIRE_RESCUE"]},
                    expected_next_step="first_aid_then_location",
                    validation_criteria=["Should detect FIRE_RESCUE"]
                ),
                ConversationTurn(
                    user_message=addr["full"],
                    expected_bot_actions=["extract_location"],
                    expected_extractions={"location": addr},
                    expected_next_step="phone",
                    validation_criteria=["Should extract location"]
                ),
                ConversationTurn(
                    user_message=phone,
                    expected_bot_actions=["validate_phone"],
                    expected_extractions={"phone": phone},
                    expected_next_step="people",
                    validation_criteria=["Should validate phone"]
                ),
                ConversationTurn(
                    user_message=f"{people_count} người",
                    expected_bot_actions=["extract_people_count"],
                    expected_extractions={"affectedPeople": {"total": people_count}},
                    expected_next_step="confirmation",
                    validation_criteria=["Should extract count"]
                ),
                ConversationTurn(
                    user_message="Đúng",
                    expected_bot_actions=["create_ticket"],
                    expected_extractions={"userConfirmed": True},
                    expected_next_step="complete",
                    validation_criteria=["Should create ticket"]
                ),
            ],
            expected_final_state={"ticketCreated": True},
            metadata={"variation": i+1}
        ))

    return test_cases


def generate_medical_emergency_flows() -> List[MultiTurnTestCase]:
    """Generate complete medical emergency conversation flows"""
    test_cases = []

    medical_scenarios = [
        {
            "initial": "Có người bị tai nạn giao thông! Người ta nằm trên đường, chảy máu nhiều!",
            "types": ["MEDICAL"],
            "first_aid_keywords": ["chảy máu", "cầm máu", "băng ép"],
            "people": "2 người bị thương, 1 người nguy kịch",
            "expected_people": {"total": 2, "injured": 2, "critical": 1}
        },
        {
            "initial": "Bà ngoại tôi bị đột quỵ! Một bên mặt méo, nói không rõ!",
            "types": ["MEDICAL"],
            "first_aid_keywords": ["đột quỵ", "nằm nghiêng", "thông đường thở"],
            "people": "1 người",
            "expected_people": {"total": 1, "critical": 1}
        },
        {
            "initial": "Có người đang lên cơn đau tim! Đau ngực, khó thở!",
            "types": ["MEDICAL"],
            "first_aid_keywords": ["đau tim", "nghỉ ngơi", "nới lỏng quần áo"],
            "people": "1 người",
            "expected_people": {"total": 1}
        },
        {
            "initial": "Trẻ con bị sặc đồ ăn! Mặt tím tái, không thở được!",
            "types": ["MEDICAL"],
            "first_aid_keywords": ["sặc", "Heimlich", "vỗ lưng"],
            "people": "1 bé",
            "expected_people": {"total": 1, "critical": 1}
        },
        {
            "initial": "Có người ngã từ tầng 2 xuống! Nằm bất động!",
            "types": ["MEDICAL"],
            "first_aid_keywords": ["chấn thương", "không di chuyển", "cố định"],
            "people": "1 người",
            "expected_people": {"total": 1, "critical": 1}
        },
        {
            "initial": "Người bị điện giật! Đang bất tỉnh!",
            "types": ["MEDICAL", "FIRE_RESCUE"],
            "first_aid_keywords": ["điện giật", "ngắt nguồn điện", "CPR"],
            "people": "1 người",
            "expected_people": {"total": 1, "critical": 1}
        },
        {
            "initial": "Có người bị rắn cắn! Chân sưng to, đau nhiều!",
            "types": ["MEDICAL"],
            "first_aid_keywords": ["rắn cắn", "giữ yên", "không hút nọc"],
            "people": "1 người",
            "expected_people": {"total": 1}
        },
        {
            "initial": "Tai nạn xe khách! Nhiều người bị thương!",
            "types": ["MEDICAL"],
            "first_aid_keywords": ["tai nạn", "sơ cứu", "cầm máu"],
            "people": "Khoảng 10 người, 3 người nặng",
            "expected_people": {"total": 10, "injured": 7, "critical": 3}
        },
        {
            "initial": "Có người bị ngộ độc thực phẩm! Nôn mửa, co giật!",
            "types": ["MEDICAL"],
            "first_aid_keywords": ["ngộ độc", "không gây nôn", "giữ mẫu"],
            "people": "4 người cùng bàn",
            "expected_people": {"total": 4}
        },
        {
            "initial": "Người bị đuối nước! Vừa vớt lên, không thở!",
            "types": ["MEDICAL", "FIRE_RESCUE"],
            "first_aid_keywords": ["đuối nước", "CPR", "hô hấp nhân tạo"],
            "people": "1 người",
            "expected_people": {"total": 1, "critical": 1}
        },
    ]

    for i, scenario in enumerate(medical_scenarios):
        addr = generate_address()
        phone = generate_phone()

        test_cases.append(MultiTurnTestCase(
            id=f"MULTI_MED_{i+1:03d}",
            name=f"Medical Emergency: {scenario['initial'][:30]}...",
            description=scenario["initial"],
            category="medical_emergency_flow",
            turns=[
                ConversationTurn(
                    user_message=scenario["initial"],
                    expected_bot_actions=["detect_emergency_type", "provide_first_aid"],
                    expected_extractions={"emergencyTypes": scenario["types"]},
                    expected_next_step="first_aid_then_location",
                    validation_criteria=[
                        f"Should detect {scenario['types']}",
                        f"Should mention: {', '.join(scenario['first_aid_keywords'][:2])}"
                    ]
                ),
                ConversationTurn(
                    user_message=addr["full"],
                    expected_bot_actions=["extract_location", "ask_phone"],
                    expected_extractions={"location": addr},
                    expected_next_step="phone",
                    validation_criteria=["Should extract location"]
                ),
                ConversationTurn(
                    user_message=phone,
                    expected_bot_actions=["validate_phone", "ask_people"],
                    expected_extractions={"phone": phone},
                    expected_next_step="people",
                    validation_criteria=["Should validate phone"]
                ),
                ConversationTurn(
                    user_message=scenario["people"],
                    expected_bot_actions=["extract_people_count", "show_confirmation"],
                    expected_extractions={"affectedPeople": scenario["expected_people"]},
                    expected_next_step="confirmation",
                    validation_criteria=["Should extract affected people correctly"]
                ),
                ConversationTurn(
                    user_message="Xác nhận",
                    expected_bot_actions=["create_ticket"],
                    expected_extractions={"userConfirmed": True},
                    expected_next_step="complete",
                    validation_criteria=["Should create ticket", "Should dispatch ambulance"]
                ),
            ],
            expected_final_state={
                "emergencyTypes": scenario["types"],
                "ticketCreated": True,
                "supportRequired": {"ambulance": True}
            },
            metadata={"scenario": i+1, "first_aid_keywords": scenario["first_aid_keywords"]}
        ))

    return test_cases


def generate_security_emergency_flows() -> List[MultiTurnTestCase]:
    """Generate complete security emergency conversation flows"""
    test_cases = []

    security_scenarios = [
        {
            "initial": "Có kẻ trộm đang đột nhập vào nhà tôi! Tôi đang trốn trong phòng!",
            "types": ["SECURITY"],
            "urgency": "HIGH"
        },
        {
            "initial": "Đang bị cướp! Có dao! Cứu tôi với!",
            "types": ["SECURITY"],
            "urgency": "CRITICAL"
        },
        {
            "initial": "Có nhóm người đánh nhau ngoài đường, đâm chém nhau!",
            "types": ["SECURITY", "MEDICAL"],
            "urgency": "CRITICAL"
        },
        {
            "initial": "Có người say rượu đang đập phá quán, đe dọa mọi người!",
            "types": ["SECURITY"],
            "urgency": "HIGH"
        },
        {
            "initial": "Tôi phát hiện có người đang rình rập trước nhà, rất đáng ngờ!",
            "types": ["SECURITY"],
            "urgency": "MEDIUM"
        },
        {
            "initial": "Bạo lực gia đình! Chồng đang đánh vợ, nghe tiếng la hét!",
            "types": ["SECURITY", "MEDICAL"],
            "urgency": "CRITICAL"
        },
        {
            "initial": "Có vụ cướp ngân hàng đang xảy ra!",
            "types": ["SECURITY"],
            "urgency": "CRITICAL"
        },
        {
            "initial": "Nhóm thanh niên đua xe, gây rối trật tự!",
            "types": ["SECURITY"],
            "urgency": "HIGH"
        },
    ]

    for i, scenario in enumerate(security_scenarios):
        addr = generate_address()
        phone = generate_phone()
        people_count = random.randint(1, 5)

        test_cases.append(MultiTurnTestCase(
            id=f"MULTI_SEC_{i+1:03d}",
            name=f"Security Emergency: {scenario['initial'][:30]}...",
            description=scenario["initial"],
            category="security_emergency_flow",
            turns=[
                ConversationTurn(
                    user_message=scenario["initial"],
                    expected_bot_actions=["detect_emergency_type", "provide_safety_guidance"],
                    expected_extractions={"emergencyTypes": scenario["types"]},
                    expected_next_step="location",
                    validation_criteria=[
                        f"Should detect {scenario['types']}",
                        "Should provide safety advice"
                    ]
                ),
                ConversationTurn(
                    user_message=addr["full"],
                    expected_bot_actions=["extract_location", "ask_phone"],
                    expected_extractions={"location": addr},
                    expected_next_step="phone",
                    validation_criteria=["Should extract location"]
                ),
                ConversationTurn(
                    user_message=phone,
                    expected_bot_actions=["validate_phone", "ask_people"],
                    expected_extractions={"phone": phone},
                    expected_next_step="people",
                    validation_criteria=["Should validate phone"]
                ),
                ConversationTurn(
                    user_message=f"{people_count} người",
                    expected_bot_actions=["extract_people_count", "show_confirmation"],
                    expected_extractions={"affectedPeople": {"total": people_count}},
                    expected_next_step="confirmation",
                    validation_criteria=["Should extract count"]
                ),
                ConversationTurn(
                    user_message="Đúng, nhanh lên!",
                    expected_bot_actions=["create_ticket"],
                    expected_extractions={"userConfirmed": True},
                    expected_next_step="complete",
                    validation_criteria=["Should create ticket", "Should dispatch police"]
                ),
            ],
            expected_final_state={
                "emergencyTypes": scenario["types"],
                "ticketCreated": True,
                "supportRequired": {"police": True}
            },
            metadata={"urgency": scenario["urgency"]}
        ))

    return test_cases


def generate_user_correction_flows() -> List[MultiTurnTestCase]:
    """Generate flows where user corrects information during conversation"""
    test_cases = []

    # Flow 1: User corrects address
    addr1 = generate_address()
    addr2 = generate_address()
    phone = generate_phone()

    test_cases.append(MultiTurnTestCase(
        id="MULTI_CORR_001",
        name="User Corrects Address",
        description="User provides wrong address then corrects it",
        category="user_correction_flow",
        turns=[
            ConversationTurn(
                user_message="Có cháy nhà!",
                expected_bot_actions=["detect_emergency_type"],
                expected_extractions={"emergencyTypes": ["FIRE_RESCUE"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=["Should detect fire"]
            ),
            ConversationTurn(
                user_message=addr1["full"],
                expected_bot_actions=["extract_location"],
                expected_extractions={"location": addr1},
                expected_next_step="phone",
                validation_criteria=["Should extract first address"]
            ),
            ConversationTurn(
                user_message=phone,
                expected_bot_actions=["validate_phone"],
                expected_extractions={"phone": phone},
                expected_next_step="people",
                validation_criteria=["Should validate phone"]
            ),
            ConversationTurn(
                user_message="2 người",
                expected_bot_actions=["extract_people_count", "show_confirmation"],
                expected_extractions={"affectedPeople": {"total": 2}},
                expected_next_step="confirmation",
                validation_criteria=["Should show confirmation"]
            ),
            ConversationTurn(
                user_message=f"Không, sai địa chỉ rồi. Địa chỉ đúng là {addr2['full']}",
                expected_bot_actions=["detect_correction", "update_location", "show_confirmation"],
                expected_extractions={"location": addr2, "isCorrection": True},
                expected_next_step="confirmation",
                validation_criteria=["Should detect correction", "Should update address", "Should show new confirmation"]
            ),
            ConversationTurn(
                user_message="Đúng rồi, xác nhận",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket with corrected address"]
            ),
        ],
        expected_final_state={
            "location": addr2,
            "ticketCreated": True
        },
        metadata={"correction_type": "address"}
    ))

    # Flow 2: User corrects phone number
    phone1 = generate_phone()
    phone2 = generate_phone()
    addr = generate_address()

    test_cases.append(MultiTurnTestCase(
        id="MULTI_CORR_002",
        name="User Corrects Phone",
        description="User provides wrong phone then corrects it",
        category="user_correction_flow",
        turns=[
            ConversationTurn(
                user_message="Tai nạn giao thông!",
                expected_bot_actions=["detect_emergency_type"],
                expected_extractions={"emergencyTypes": ["MEDICAL"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=["Should detect medical"]
            ),
            ConversationTurn(
                user_message=addr["full"],
                expected_bot_actions=["extract_location"],
                expected_extractions={"location": addr},
                expected_next_step="phone",
                validation_criteria=["Should extract location"]
            ),
            ConversationTurn(
                user_message=phone1,
                expected_bot_actions=["validate_phone"],
                expected_extractions={"phone": phone1},
                expected_next_step="people",
                validation_criteria=["Should validate first phone"]
            ),
            ConversationTurn(
                user_message="3 người",
                expected_bot_actions=["extract_people_count", "show_confirmation"],
                expected_extractions={"affectedPeople": {"total": 3}},
                expected_next_step="confirmation",
                validation_criteria=["Should show confirmation"]
            ),
            ConversationTurn(
                user_message=f"Xin lỗi, số điện thoại đúng là {phone2}",
                expected_bot_actions=["detect_correction", "update_phone", "show_confirmation"],
                expected_extractions={"phone": phone2, "isCorrection": True},
                expected_next_step="confirmation",
                validation_criteria=["Should update phone", "Should show new confirmation"]
            ),
            ConversationTurn(
                user_message="OK",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket with corrected phone"]
            ),
        ],
        expected_final_state={
            "phone": phone2,
            "ticketCreated": True
        },
        metadata={"correction_type": "phone"}
    ))

    # Flow 3: User corrects people count
    addr = generate_address()
    phone = generate_phone()

    test_cases.append(MultiTurnTestCase(
        id="MULTI_CORR_003",
        name="User Corrects People Count",
        description="User corrects number of affected people",
        category="user_correction_flow",
        turns=[
            ConversationTurn(
                user_message="Có cháy ở nhà hàng xóm!",
                expected_bot_actions=["detect_emergency_type"],
                expected_extractions={"emergencyTypes": ["FIRE_RESCUE"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=["Should detect fire"]
            ),
            ConversationTurn(
                user_message=addr["full"],
                expected_bot_actions=["extract_location"],
                expected_extractions={"location": addr},
                expected_next_step="phone",
                validation_criteria=["Should extract location"]
            ),
            ConversationTurn(
                user_message=phone,
                expected_bot_actions=["validate_phone"],
                expected_extractions={"phone": phone},
                expected_next_step="people",
                validation_criteria=["Should validate phone"]
            ),
            ConversationTurn(
                user_message="2 người",
                expected_bot_actions=["extract_people_count", "show_confirmation"],
                expected_extractions={"affectedPeople": {"total": 2}},
                expected_next_step="confirmation",
                validation_criteria=["Should show confirmation with 2 people"]
            ),
            ConversationTurn(
                user_message="Không, thực ra có 5 người, tôi đếm nhầm",
                expected_bot_actions=["detect_correction", "update_people_count", "show_confirmation"],
                expected_extractions={"affectedPeople": {"total": 5}, "isCorrection": True},
                expected_next_step="confirmation",
                validation_criteria=["Should update to 5 people", "Should show new confirmation"]
            ),
            ConversationTurn(
                user_message="Xác nhận",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket with 5 people"]
            ),
        ],
        expected_final_state={
            "affectedPeople": {"total": 5},
            "ticketCreated": True
        },
        metadata={"correction_type": "people_count"}
    ))

    # Flow 4: Multiple corrections
    addr1 = generate_address()
    addr2 = generate_address()
    phone1 = generate_phone()
    phone2 = generate_phone()

    test_cases.append(MultiTurnTestCase(
        id="MULTI_CORR_004",
        name="Multiple Corrections",
        description="User makes multiple corrections during confirmation",
        category="user_correction_flow",
        turns=[
            ConversationTurn(
                user_message="Có vụ đánh nhau!",
                expected_bot_actions=["detect_emergency_type"],
                expected_extractions={"emergencyTypes": ["SECURITY"]},
                expected_next_step="location",
                validation_criteria=["Should detect security"]
            ),
            ConversationTurn(
                user_message=addr1["full"],
                expected_bot_actions=["extract_location"],
                expected_extractions={"location": addr1},
                expected_next_step="phone",
                validation_criteria=["Should extract location"]
            ),
            ConversationTurn(
                user_message=phone1,
                expected_bot_actions=["validate_phone"],
                expected_extractions={"phone": phone1},
                expected_next_step="people",
                validation_criteria=["Should validate phone"]
            ),
            ConversationTurn(
                user_message="3 người",
                expected_bot_actions=["extract_people_count", "show_confirmation"],
                expected_extractions={"affectedPeople": {"total": 3}},
                expected_next_step="confirmation",
                validation_criteria=["Should show confirmation"]
            ),
            ConversationTurn(
                user_message=f"Sai hết rồi! Địa chỉ là {addr2['address']}, SĐT là {phone2}",
                expected_bot_actions=["detect_correction", "update_multiple_fields"],
                expected_extractions={"location": {"address": addr2["address"]}, "phone": phone2},
                expected_next_step="confirmation",
                validation_criteria=["Should update both fields"]
            ),
            ConversationTurn(
                user_message="Đúng rồi",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket with corrected info"]
            ),
        ],
        expected_final_state={"ticketCreated": True},
        metadata={"correction_type": "multiple"}
    ))

    return test_cases


def generate_authenticated_user_flows() -> List[MultiTurnTestCase]:
    """Generate flows for authenticated users (phone pre-filled)"""
    test_cases = []

    # Pre-saved user info
    saved_phones = [generate_phone() for _ in range(5)]

    for i, saved_phone in enumerate(saved_phones):
        addr = generate_address()

        emergency_types = [
            ("Cháy nhà tôi!", ["FIRE_RESCUE"]),
            ("Có tai nạn giao thông!", ["MEDICAL"]),
            ("Có kẻ trộm!", ["SECURITY"]),
            ("Người nhà bị đột quỵ!", ["MEDICAL"]),
            ("Có vụ đánh nhau!", ["SECURITY", "MEDICAL"]),
        ]

        emergency, types = emergency_types[i]
        people_count = random.randint(1, 5)

        test_cases.append(MultiTurnTestCase(
            id=f"MULTI_AUTH_{i+1:03d}",
            name=f"Authenticated User Flow {i+1}",
            description=f"Authenticated user with saved phone: {emergency}",
            category="authenticated_user_flow",
            is_authenticated=True,
            user_memory={"savedPhone": saved_phone, "savedName": f"Người dùng {i+1}"},
            turns=[
                ConversationTurn(
                    user_message=emergency,
                    expected_bot_actions=["detect_emergency_type", "provide_guidance"],
                    expected_extractions={"emergencyTypes": types},
                    expected_next_step="first_aid_then_location",
                    validation_criteria=["Should detect emergency type"]
                ),
                ConversationTurn(
                    user_message=addr["full"],
                    expected_bot_actions=["extract_location", "skip_phone", "ask_people"],
                    expected_extractions={"location": addr},
                    expected_next_step="people",  # Should SKIP phone
                    validation_criteria=[
                        "Should extract location",
                        "Should NOT ask for phone (user has saved phone)",
                        "Should ask for people count directly"
                    ]
                ),
                ConversationTurn(
                    user_message=f"{people_count} người",
                    expected_bot_actions=["extract_people_count", "show_confirmation"],
                    expected_extractions={"affectedPeople": {"total": people_count}},
                    expected_next_step="confirmation",
                    validation_criteria=[
                        "Should show confirmation",
                        "Confirmation should show saved phone number"
                    ]
                ),
                ConversationTurn(
                    user_message="Xác nhận",
                    expected_bot_actions=["create_ticket"],
                    expected_extractions={"userConfirmed": True},
                    expected_next_step="complete",
                    validation_criteria=[
                        "Should create ticket",
                        "Ticket should use saved phone"
                    ]
                ),
            ],
            expected_final_state={
                "phone": saved_phone,
                "ticketCreated": True,
                "skippedPhoneCollection": True
            },
            metadata={"saved_phone": saved_phone}
        ))

    return test_cases


def generate_edge_case_flows() -> List[MultiTurnTestCase]:
    """Generate edge case conversation flows"""
    test_cases = []

    # Flow 1: User provides all info in first message
    addr = generate_address()
    phone = generate_phone()

    test_cases.append(MultiTurnTestCase(
        id="MULTI_EDGE_001",
        name="All Info in First Message",
        description="User provides all required information upfront",
        category="edge_case_flow",
        turns=[
            ConversationTurn(
                user_message=f"Có cháy nhà ở {addr['full']}! Số tôi là {phone}, có 3 người trong nhà!",
                expected_bot_actions=["extract_all_info", "show_confirmation"],
                expected_extractions={
                    "emergencyTypes": ["FIRE_RESCUE"],
                    "location": addr,
                    "phone": phone,
                    "affectedPeople": {"total": 3}
                },
                expected_next_step="confirmation",
                validation_criteria=[
                    "Should extract all info from single message",
                    "Should go directly to confirmation"
                ]
            ),
            ConversationTurn(
                user_message="Đúng",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket immediately"]
            ),
        ],
        expected_final_state={"ticketCreated": True},
        metadata={"single_message_info": True}
    ))

    # Flow 2: User is very brief/minimal responses
    addr = generate_address()
    phone = generate_phone()

    test_cases.append(MultiTurnTestCase(
        id="MULTI_EDGE_002",
        name="Minimal User Responses",
        description="User gives very brief responses",
        category="edge_case_flow",
        turns=[
            ConversationTurn(
                user_message="Cháy",
                expected_bot_actions=["detect_emergency_type", "ask_details"],
                expected_extractions={"emergencyTypes": ["FIRE_RESCUE"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=["Should understand minimal input"]
            ),
            ConversationTurn(
                user_message=addr["address"],  # Just street address
                expected_bot_actions=["extract_partial_location", "ask_more"],
                expected_extractions={"location": {"address": addr["address"]}},
                expected_next_step="location_clarification",
                validation_criteria=["Should ask for more location details"]
            ),
            ConversationTurn(
                user_message=f"{addr['ward']}, {addr['district']}",
                expected_bot_actions=["complete_location", "ask_phone"],
                expected_extractions={"location": {"ward": addr["ward"]}},
                expected_next_step="phone",
                validation_criteria=["Should complete location"]
            ),
            ConversationTurn(
                user_message=phone,
                expected_bot_actions=["validate_phone"],
                expected_extractions={"phone": phone},
                expected_next_step="people",
                validation_criteria=["Should validate phone"]
            ),
            ConversationTurn(
                user_message="1",
                expected_bot_actions=["extract_people_count"],
                expected_extractions={"affectedPeople": {"total": 1}},
                expected_next_step="confirmation",
                validation_criteria=["Should understand '1' as people count"]
            ),
            ConversationTurn(
                user_message="ok",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should understand 'ok' as confirmation"]
            ),
        ],
        expected_final_state={"ticketCreated": True},
        metadata={"minimal_responses": True}
    ))

    # Flow 3: Invalid phone then valid phone
    addr = generate_address()
    invalid_phone = "0123456789"  # Invalid prefix
    valid_phone = generate_phone()

    test_cases.append(MultiTurnTestCase(
        id="MULTI_EDGE_003",
        name="Invalid Phone Then Valid",
        description="User provides invalid phone, then valid phone",
        category="edge_case_flow",
        turns=[
            ConversationTurn(
                user_message="Có tai nạn!",
                expected_bot_actions=["detect_emergency_type"],
                expected_extractions={"emergencyTypes": ["MEDICAL"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=["Should detect medical"]
            ),
            ConversationTurn(
                user_message=addr["full"],
                expected_bot_actions=["extract_location"],
                expected_extractions={"location": addr},
                expected_next_step="phone",
                validation_criteria=["Should extract location"]
            ),
            ConversationTurn(
                user_message=invalid_phone,
                expected_bot_actions=["reject_phone", "ask_again"],
                expected_extractions={"phoneValid": False},
                expected_next_step="phone",  # Stay on phone step
                validation_criteria=[
                    "Should reject invalid phone",
                    "Should explain why invalid",
                    "Should ask for valid phone"
                ]
            ),
            ConversationTurn(
                user_message=valid_phone,
                expected_bot_actions=["validate_phone"],
                expected_extractions={"phone": valid_phone, "phoneValid": True},
                expected_next_step="people",
                validation_criteria=["Should accept valid phone"]
            ),
            ConversationTurn(
                user_message="2 người",
                expected_bot_actions=["extract_people_count"],
                expected_extractions={"affectedPeople": {"total": 2}},
                expected_next_step="confirmation",
                validation_criteria=["Should extract count"]
            ),
            ConversationTurn(
                user_message="Xác nhận",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket"]
            ),
        ],
        expected_final_state={
            "phone": valid_phone,
            "ticketCreated": True
        },
        metadata={"phone_validation_retry": True}
    ))

    # Flow 4: User changes mind about emergency type
    addr = generate_address()
    phone = generate_phone()

    test_cases.append(MultiTurnTestCase(
        id="MULTI_EDGE_004",
        name="Change Emergency Type",
        description="User initially reports wrong type then corrects",
        category="edge_case_flow",
        turns=[
            ConversationTurn(
                user_message="Có cháy!",
                expected_bot_actions=["detect_emergency_type"],
                expected_extractions={"emergencyTypes": ["FIRE_RESCUE"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=["Should detect fire"]
            ),
            ConversationTurn(
                user_message=addr["full"],
                expected_bot_actions=["extract_location"],
                expected_extractions={"location": addr},
                expected_next_step="phone",
                validation_criteria=["Should extract location"]
            ),
            ConversationTurn(
                user_message=phone,
                expected_bot_actions=["validate_phone"],
                expected_extractions={"phone": phone},
                expected_next_step="people",
                validation_criteria=["Should validate phone"]
            ),
            ConversationTurn(
                user_message="2 người",
                expected_bot_actions=["extract_people_count"],
                expected_extractions={"affectedPeople": {"total": 2}},
                expected_next_step="confirmation",
                validation_criteria=["Should show confirmation"]
            ),
            ConversationTurn(
                user_message="Xin lỗi, không phải cháy. Thực ra là có người bị thương do tai nạn",
                expected_bot_actions=["detect_correction", "update_emergency_type"],
                expected_extractions={"emergencyTypes": ["MEDICAL"], "isCorrection": True},
                expected_next_step="confirmation",
                validation_criteria=["Should update to MEDICAL", "Should update guidance"]
            ),
            ConversationTurn(
                user_message="Đúng",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket with MEDICAL type"]
            ),
        ],
        expected_final_state={
            "emergencyTypes": ["MEDICAL"],
            "ticketCreated": True
        },
        metadata={"type_change": True}
    ))

    # Flow 5: Very long conversation with multiple clarifications
    test_cases.append(MultiTurnTestCase(
        id="MULTI_EDGE_005",
        name="Long Conversation with Clarifications",
        description="Extended conversation requiring multiple clarifications",
        category="edge_case_flow",
        turns=[
            ConversationTurn(
                user_message="Có vấn đề ở đây",
                expected_bot_actions=["ask_clarification"],
                expected_extractions={},
                expected_next_step="emergency_clarification",
                validation_criteria=["Should ask what happened"]
            ),
            ConversationTurn(
                user_message="Có người bị thương",
                expected_bot_actions=["detect_emergency_type"],
                expected_extractions={"emergencyTypes": ["MEDICAL"]},
                expected_next_step="first_aid_then_location",
                validation_criteria=["Should detect medical"]
            ),
            ConversationTurn(
                user_message="Gần đây",
                expected_bot_actions=["ask_specific_location"],
                expected_extractions={},
                expected_next_step="location_clarification",
                validation_criteria=["Should ask for specific address"]
            ),
            ConversationTurn(
                user_message="Ở đường Nguyễn Huệ",
                expected_bot_actions=["extract_partial", "ask_more"],
                expected_extractions={"location": {"address": "Đường Nguyễn Huệ"}},
                expected_next_step="location_clarification",
                validation_criteria=["Should ask for ward/district"]
            ),
            ConversationTurn(
                user_message="Quận 1",
                expected_bot_actions=["extract_partial", "ask_more"],
                expected_extractions={"location": {"district": "Quận 1"}},
                expected_next_step="location_clarification",
                validation_criteria=["Should ask for specific number"]
            ),
            ConversationTurn(
                user_message="Số 123, Phường Bến Nghé",
                expected_bot_actions=["complete_location", "ask_phone"],
                expected_extractions={"location": {"address": "Số 123", "ward": "Phường Bến Nghé"}},
                expected_next_step="phone",
                validation_criteria=["Should have complete location"]
            ),
            ConversationTurn(
                user_message="0912345678",
                expected_bot_actions=["validate_phone"],
                expected_extractions={"phone": "0912345678"},
                expected_next_step="people",
                validation_criteria=["Should validate phone"]
            ),
            ConversationTurn(
                user_message="Không biết, nhiều người",
                expected_bot_actions=["estimate_people"],
                expected_extractions={"affectedPeople": {"total": 5}},  # Estimated
                expected_next_step="confirmation",
                validation_criteria=["Should estimate people count"]
            ),
            ConversationTurn(
                user_message="Xác nhận",
                expected_bot_actions=["create_ticket"],
                expected_extractions={"userConfirmed": True},
                expected_next_step="complete",
                validation_criteria=["Should create ticket"]
            ),
        ],
        expected_final_state={"ticketCreated": True},
        metadata={"multiple_clarifications": True, "turn_count": 9}
    ))

    return test_cases


def generate_all_multi_turn_test_cases() -> List[MultiTurnTestCase]:
    """Generate all multi-turn conversation test cases"""
    all_cases = []

    print("Generating multi-turn test cases...")

    print("  - Fire emergency flows...")
    all_cases.extend(generate_fire_emergency_flows())

    print("  - Medical emergency flows...")
    all_cases.extend(generate_medical_emergency_flows())

    print("  - Security emergency flows...")
    all_cases.extend(generate_security_emergency_flows())

    print("  - User correction flows...")
    all_cases.extend(generate_user_correction_flows())

    print("  - Authenticated user flows...")
    all_cases.extend(generate_authenticated_user_flows())

    print("  - Edge case flows...")
    all_cases.extend(generate_edge_case_flows())

    print(f"\nTotal multi-turn test cases: {len(all_cases)}")

    return all_cases


def export_multi_turn_test_cases(test_cases: List[MultiTurnTestCase], filename: str = "multi_turn_test_cases.json"):
    """Export multi-turn test cases to JSON"""
    import json
    from dataclasses import asdict

    data = [asdict(tc) for tc in test_cases]

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Exported {len(test_cases)} multi-turn test cases to {filename}")


if __name__ == "__main__":
    test_cases = generate_all_multi_turn_test_cases()
    export_multi_turn_test_cases(test_cases)
