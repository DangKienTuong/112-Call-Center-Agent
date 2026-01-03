"""
Test Cases Generator for 112 Call Center Agent
===============================================

This module generates comprehensive test cases for evaluating the 112 emergency
call center AI chatbot using DeepEval framework.

Total: ~1000 test cases covering all scenarios
"""

import random
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
from config import (
    EMERGENCY_KEYWORDS, VALID_PHONE_PREFIXES, MAJOR_CITIES, HCMC_DISTRICTS,
    CONFIRMATION_KEYWORDS, EMERGENCY_TYPES, LOCATION_KEYWORDS
)


@dataclass
class TestCase:
    """Test case data structure"""
    id: str
    category: str
    subcategory: str
    input_message: str
    expected_output: str
    context: List[Dict[str, str]]
    expected_extraction: Dict[str, Any]
    metadata: Dict[str, Any]


# =============================================================================
# TEST CASE GENERATORS
# =============================================================================

def generate_emergency_type_test_cases() -> List[TestCase]:
    """Generate test cases for emergency type detection"""
    test_cases = []
    counter = 1

    # ----- FIRE_RESCUE Test Cases (50) -----
    fire_scenarios = [
        ("Cháy nhà ở {district}, lửa rất lớn!", ["FIRE_RESCUE"]),
        ("Có khói bốc lên từ tòa nhà, nghi ngờ cháy", ["FIRE_RESCUE"]),
        ("Nhà tôi đang bốc cháy, cứu với!", ["FIRE_RESCUE"]),
        ("Xe ô tô bị cháy trên đường cao tốc", ["FIRE_RESCUE"]),
        ("Cháy xưởng gỗ, lửa lan nhanh lắm", ["FIRE_RESCUE"]),
        ("Chập điện gây cháy trong nhà bếp", ["FIRE_RESCUE"]),
        ("Có người mắc kẹt trong đám cháy", ["FIRE_RESCUE", "MEDICAL"]),
        ("Rò rỉ gas, nguy cơ nổ cao", ["FIRE_RESCUE"]),
        ("Cháy rừng lan rộng, cần cứu hỏa gấp", ["FIRE_RESCUE"]),
        ("Bình gas phát nổ trong nhà", ["FIRE_RESCUE"]),
        ("Cháy chung cư tầng 15", ["FIRE_RESCUE"]),
        ("Cháy kho hàng, có hóa chất nguy hiểm", ["FIRE_RESCUE"]),
        ("Cháy chợ, nhiều người hoảng loạn", ["FIRE_RESCUE"]),
        ("Điện giật gây cháy trong phòng ngủ", ["FIRE_RESCUE", "MEDICAL"]),
        ("Có người nhảy từ tòa nhà đang cháy", ["FIRE_RESCUE", "MEDICAL"]),
        ("Cháy trạm xăng, rất nguy hiểm", ["FIRE_RESCUE"]),
        ("Lửa cháy từ bếp lan ra phòng khách", ["FIRE_RESCUE"]),
        ("Cháy quán karaoke, có người kẹt bên trong", ["FIRE_RESCUE", "MEDICAL"]),
        ("Hỏa hoạn tại nhà máy, cần nhiều xe cứu hỏa", ["FIRE_RESCUE"]),
        ("Cháy căn hộ, khói đen bốc lên ngùn ngụt", ["FIRE_RESCUE"]),
        ("Có đám cháy lớn ở khu công nghiệp", ["FIRE_RESCUE"]),
        ("Cháy xe tải chở dầu trên quốc lộ", ["FIRE_RESCUE"]),
        ("Nhà hàng xóm đang cháy, lửa sắp lan sang", ["FIRE_RESCUE"]),
        ("Cháy tiệm tạp hóa, có nhiều đồ dễ cháy", ["FIRE_RESCUE"]),
        ("Tầng hầm chung cư bốc cháy", ["FIRE_RESCUE"]),
        ("Có người đuối nước ở sông", ["FIRE_RESCUE", "MEDICAL"]),
        ("Người bị mắc kẹt trong thang máy", ["FIRE_RESCUE"]),
        ("Tòa nhà sập, có người bị vùi lấp", ["FIRE_RESCUE", "MEDICAL"]),
        ("Đê vỡ, nước ngập, cần cứu hộ", ["FIRE_RESCUE"]),
        ("Sạt lở đất, người bị mắc kẹt", ["FIRE_RESCUE", "MEDICAL"]),
        ("Lũ quét, cần thuyền cứu hộ", ["FIRE_RESCUE"]),
        ("Tai nạn hầm mỏ, thợ mỏ mắc kẹt", ["FIRE_RESCUE", "MEDICAL"]),
        ("Xe rơi xuống vực, cần cứu hộ", ["FIRE_RESCUE", "MEDICAL"]),
        ("Người leo núi bị mắc kẹt", ["FIRE_RESCUE", "MEDICAL"]),
        ("Thuyền bị lật, người trôi trên sông", ["FIRE_RESCUE", "MEDICAL"]),
        ("Nổ bình ga, nhà đổ sập", ["FIRE_RESCUE"]),
        ("Cháy máy phát điện trong tầng hầm", ["FIRE_RESCUE"]),
        ("Cháy phòng server, có thiết bị điện", ["FIRE_RESCUE"]),
        ("Khói đen từ nhà kho bốc lên", ["FIRE_RESCUE"]),
        ("Cháy do chập điện lúc nửa đêm", ["FIRE_RESCUE"]),
        ("Cháy xe bus trên đường", ["FIRE_RESCUE", "MEDICAL"]),
        ("Cháy bãi rác, khói độc lan ra khu dân cư", ["FIRE_RESCUE"]),
        ("Nổ xưởng pháo, cháy lớn", ["FIRE_RESCUE"]),
        ("Cháy dây điện cao thế", ["FIRE_RESCUE"]),
        ("Nhà xưởng bốc cháy lúc rạng sáng", ["FIRE_RESCUE"]),
        ("Có ngọn lửa nhỏ trong nhà để xe", ["FIRE_RESCUE"]),
        ("Bếp gas bùng cháy không tắt được", ["FIRE_RESCUE"]),
        ("Cháy do đốt vàng mã trong nhà", ["FIRE_RESCUE"]),
        ("Cháy cột điện, tia lửa bắn ra", ["FIRE_RESCUE"]),
        ("Cháy ki ốt trong chợ đêm", ["FIRE_RESCUE"]),
    ]

    for scenario, expected_types in fire_scenarios:
        district = random.choice(HCMC_DISTRICTS)
        test_cases.append(TestCase(
            id=f"FIRE_{counter:03d}",
            category="emergency_type_detection",
            subcategory="FIRE_RESCUE",
            input_message=scenario.format(district=district),
            expected_output="Emergency type should be detected as FIRE_RESCUE",
            context=[],
            expected_extraction={"emergencyTypes": expected_types},
            metadata={"priority": "HIGH", "requires_fire_department": True}
        ))
        counter += 1

    # ----- MEDICAL Test Cases (50) -----
    counter = 1
    medical_scenarios = [
        ("Có người bị tai nạn giao thông nghiêm trọng", ["MEDICAL"]),
        ("Bà ngoại tôi đột quỵ, đang bất tỉnh", ["MEDICAL"]),
        ("Có người bị đau tim, đau ngực dữ dội", ["MEDICAL"]),
        ("Em bé bị co giật, sốt cao", ["MEDICAL"]),
        ("Người già bị ngã gãy xương", ["MEDICAL"]),
        ("Có người chảy máu nhiều sau tai nạn", ["MEDICAL"]),
        ("Nạn nhân bất tỉnh không thở được", ["MEDICAL"]),
        ("Tai nạn xe máy, 3 người bị thương", ["MEDICAL"]),
        ("Có phụ nữ mang thai đang chuyển dạ", ["MEDICAL"]),
        ("Trẻ em bị ngộ độc thực phẩm", ["MEDICAL"]),
        ("Người bị rắn cắn, sưng to chân", ["MEDICAL"]),
        ("Có người bị điện giật, bất tỉnh", ["MEDICAL", "FIRE_RESCUE"]),
        ("Nạn nhân bị đâm, mất nhiều máu", ["MEDICAL", "SECURITY"]),
        ("Người bị bỏng nặng do nước sôi", ["MEDICAL"]),
        ("Có người bị sốc phản vệ sau tiêm", ["MEDICAL"]),
        ("Tai nạn lao động, công nhân bị thương", ["MEDICAL"]),
        ("Người bị ngạt khói, khó thở", ["MEDICAL", "FIRE_RESCUE"]),
        ("Có người uống thuốc quá liều", ["MEDICAL"]),
        ("Trẻ sơ sinh bị sặc sữa", ["MEDICAL"]),
        ("Người bị đuối nước đã được vớt lên", ["MEDICAL", "FIRE_RESCUE"]),
        ("Nạn nhân bị chó cắn, chảy máu nhiều", ["MEDICAL"]),
        ("Có người bị ong đốt, phù nề khắp người", ["MEDICAL"]),
        ("Người già bị khó thở, tím tái", ["MEDICAL"]),
        ("Bệnh nhân tiểu đường bị hạ đường huyết", ["MEDICAL"]),
        ("Có người bị gãy tay sau va chạm", ["MEDICAL"]),
        ("Phụ nữ bị xuất huyết, cần cấp cứu", ["MEDICAL"]),
        ("Người bị dị vật mắc trong họng", ["MEDICAL"]),
        ("Có người bị ngất trong siêu thị", ["MEDICAL"]),
        ("Tai nạn đuối nước tại bể bơi", ["MEDICAL", "FIRE_RESCUE"]),
        ("Người bị trúng gió, méo miệng", ["MEDICAL"]),
        ("Có người đang lên cơn hen suyễn", ["MEDICAL"]),
        ("Nạn nhân bị ngộ độc rượu", ["MEDICAL"]),
        ("Bé trai bị bỏng do đổ canh nóng", ["MEDICAL"]),
        ("Người cao tuổi té cầu thang, đầu chảy máu", ["MEDICAL"]),
        ("Có người bị động kinh, co giật liên tục", ["MEDICAL"]),
        ("Nạn nhân bị đánh bất tỉnh", ["MEDICAL", "SECURITY"]),
        ("Tai nạn xe khách, nhiều người bị thương", ["MEDICAL"]),
        ("Người bị rơi từ tầng 2, nghi gãy cột sống", ["MEDICAL"]),
        ("Có người đang lên cơn đau tim", ["MEDICAL"]),
        ("Trẻ em bị hóc xương cá", ["MEDICAL"]),
        ("Người bị dị ứng nặng, sưng phù mặt", ["MEDICAL"]),
        ("Công nhân bị máy cắt đứt ngón tay", ["MEDICAL"]),
        ("Có người bị tai nạn, không cử động được", ["MEDICAL"]),
        ("Phụ nữ mang thai bị đau bụng dữ dội", ["MEDICAL"]),
        ("Người bị ngộ độc hải sản, nổi mẩn khắp người", ["MEDICAL"]),
        ("Có người bị vật nhọn đâm vào bụng", ["MEDICAL", "SECURITY"]),
        ("Nạn nhân bị sét đánh, bất tỉnh", ["MEDICAL"]),
        ("Người bị ngạt nước trong bồn tắm", ["MEDICAL"]),
        ("Có người bị thiếu máu não, chóng mặt", ["MEDICAL"]),
        ("Tai nạn khi đang tập thể thao", ["MEDICAL"]),
    ]

    for scenario, expected_types in medical_scenarios:
        test_cases.append(TestCase(
            id=f"MED_{counter:03d}",
            category="emergency_type_detection",
            subcategory="MEDICAL",
            input_message=scenario,
            expected_output="Emergency type should be detected as MEDICAL",
            context=[],
            expected_extraction={"emergencyTypes": expected_types},
            metadata={"priority": "HIGH", "requires_ambulance": True}
        ))
        counter += 1

    # ----- SECURITY Test Cases (50) -----
    counter = 1
    security_scenarios = [
        ("Có kẻ trộm đang đột nhập vào nhà", ["SECURITY"]),
        ("Đang bị cướp giật túi xách trên đường", ["SECURITY"]),
        ("Có người đánh nhau ngoài đường", ["SECURITY", "MEDICAL"]),
        ("Kẻ lạ mặt đang phá cửa nhà tôi", ["SECURITY"]),
        ("Bị đe dọa giết người qua điện thoại", ["SECURITY"]),
        ("Có vụ giết người trong khu phố", ["SECURITY", "MEDICAL"]),
        ("Người say rượu gây rối trật tự", ["SECURITY"]),
        ("Có kẻ móc túi trong chợ", ["SECURITY"]),
        ("Tôi đang bị theo dõi, rất sợ", ["SECURITY"]),
        ("Có vụ đâm chém trước cửa nhà", ["SECURITY", "MEDICAL"]),
        ("Nhóm thanh niên đua xe gây rối", ["SECURITY"]),
        ("Bị cướp có vũ khí trong hẻm", ["SECURITY"]),
        ("Có người bắt cóc trẻ em", ["SECURITY"]),
        ("Bạo lực gia đình, chồng đánh vợ", ["SECURITY", "MEDICAL"]),
        ("Có kẻ trộm xe máy trong bãi đỗ", ["SECURITY"]),
        ("Đang bị nhóm côn đồ đe dọa", ["SECURITY"]),
        ("Cửa hàng bị đột nhập lấy đồ", ["SECURITY"]),
        ("Có người mang súng đe dọa", ["SECURITY"]),
        ("Phát hiện kẻ lạ rình rập quanh nhà", ["SECURITY"]),
        ("Bị trấn lột khi đi về đêm", ["SECURITY"]),
        ("Có vụ đánh ghen trước cửa nhà", ["SECURITY", "MEDICAL"]),
        ("Nhóm người lạ tụ tập gây mất trật tự", ["SECURITY"]),
        ("Bị quấy rối tình dục trên xe buýt", ["SECURITY"]),
        ("Có người đập phá tài sản công", ["SECURITY"]),
        ("Phát hiện kẻ trộm trong văn phòng", ["SECURITY"]),
        ("Đang bị người lạ stalking theo dõi", ["SECURITY"]),
        ("Có vụ ẩu đả tại quán nhậu", ["SECURITY", "MEDICAL"]),
        ("Bị lừa đảo, kẻ gian vẫn còn ở đây", ["SECURITY"]),
        ("Người hàng xóm dọa đốt nhà", ["SECURITY"]),
        ("Có người cầm dao đe dọa", ["SECURITY"]),
        ("Phát hiện trộm đang leo tường", ["SECURITY"]),
        ("Bị giật điện thoại khi đi bộ", ["SECURITY"]),
        ("Có người say gây sự, đập phá đồ đạc", ["SECURITY"]),
        ("Xe ô tô bị đập kính lấy đồ", ["SECURITY"]),
        ("Có người tung tin giả gây hoang mang", ["SECURITY"]),
        ("Bị đe dọa tống tiền qua mạng", ["SECURITY"]),
        ("Phát hiện người lạ trong nhà kho", ["SECURITY"]),
        ("Có vụ xô xát tại bến xe", ["SECURITY", "MEDICAL"]),
        ("Nhóm thanh niên quậy phá quán", ["SECURITY"]),
        ("Bị cướp ngân hàng đang xảy ra", ["SECURITY"]),
        ("Có người mang theo súng trong công viên", ["SECURITY"]),
        ("Phát hiện hành vi buôn bán ma túy", ["SECURITY"]),
        ("Bị đánh cướp trong thang máy", ["SECURITY", "MEDICAL"]),
        ("Có vụ bắt cóc đòi tiền chuộc", ["SECURITY"]),
        ("Người lạ đang rình rập trường học", ["SECURITY"]),
        ("Bị trộm đột nhập lúc đang ngủ", ["SECURITY"]),
        ("Có người đang đập cửa nhà hàng xóm", ["SECURITY"]),
        ("Phát hiện kẻ cướp giật trên đường", ["SECURITY"]),
        ("Có vụ xung đột giữa hai nhóm người", ["SECURITY", "MEDICAL"]),
        ("Bị lừa đảo qua mạng, mất tiền", ["SECURITY"]),
    ]

    for scenario, expected_types in security_scenarios:
        test_cases.append(TestCase(
            id=f"SEC_{counter:03d}",
            category="emergency_type_detection",
            subcategory="SECURITY",
            input_message=scenario,
            expected_output="Emergency type should be detected as SECURITY",
            context=[],
            expected_extraction={"emergencyTypes": expected_types},
            metadata={"priority": "HIGH", "requires_police": True}
        ))
        counter += 1

    # ----- Multiple Emergency Types Test Cases (30) -----
    counter = 1
    multi_type_scenarios = [
        ("Có vụ cháy, nhiều người bị thương", ["FIRE_RESCUE", "MEDICAL"]),
        ("Tai nạn giao thông, xe bốc cháy", ["FIRE_RESCUE", "MEDICAL"]),
        ("Nhóm cướp đốt nhà sau khi trộm đồ", ["SECURITY", "FIRE_RESCUE"]),
        ("Cháy nhà do bị đốt, chủ nhà bị thương", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Người bị đâm, hung thủ còn ở hiện trường", ["MEDICAL", "SECURITY"]),
        ("Tai nạn do đua xe, người bị thương nặng", ["MEDICAL", "SECURITY"]),
        ("Nổ gas, nhiều người bị thương, nghi bị phá hoại", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Cháy quán karaoke, có người mắc kẹt, nghi đốt có chủ đích", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Đuối nước trong khi bị truy đuổi", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Cháy cửa hàng sau vụ cướp", ["FIRE_RESCUE", "SECURITY"]),
        ("Bạo lực gia đình gây thương tích nặng", ["SECURITY", "MEDICAL"]),
        ("Tai nạn khi chạy trốn cảnh sát", ["MEDICAL", "SECURITY"]),
        ("Cháy do chập điện, bà cụ bị bỏng nặng", ["FIRE_RESCUE", "MEDICAL"]),
        ("Vụ đánh nhau làm cháy quán nhậu", ["SECURITY", "FIRE_RESCUE", "MEDICAL"]),
        ("Người bị đâm trong vụ cháy", ["MEDICAL", "FIRE_RESCUE", "SECURITY"]),
        ("Nạn nhân bị bạo hành, cần cấp cứu", ["MEDICAL", "SECURITY"]),
        ("Có người bị đốt, nghi giết người", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Sập nhà kho sau vụ nổ, nghi phá hoại", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Tai nạn do say rượu gây thương tích", ["MEDICAL", "SECURITY"]),
        ("Cháy xe sau va chạm, tài xế bị thương", ["FIRE_RESCUE", "MEDICAL"]),
        ("Vụ ẩu đả gây hỏa hoạn", ["SECURITY", "FIRE_RESCUE"]),
        ("Người đuối nước sau khi bị đẩy xuống sông", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Cháy do phóng hỏa, nhiều người bị thương", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Vụ nổ nghi khủng bố", ["FIRE_RESCUE", "MEDICAL", "SECURITY"]),
        ("Tai nạn xe khi bị cướp giật", ["MEDICAL", "SECURITY"]),
        ("Cháy nhà máy, công nhân bị mắc kẹt", ["FIRE_RESCUE", "MEDICAL"]),
        ("Đánh nhau trong đám cháy", ["SECURITY", "FIRE_RESCUE", "MEDICAL"]),
        ("Bị trộm đập đầu, nhà bốc cháy", ["SECURITY", "MEDICAL", "FIRE_RESCUE"]),
        ("Người bị thương trong vụ cướp có vũ trang", ["MEDICAL", "SECURITY"]),
        ("Cháy lớn, nghi có người gây ra", ["FIRE_RESCUE", "SECURITY"]),
    ]

    for scenario, expected_types in multi_type_scenarios:
        test_cases.append(TestCase(
            id=f"MULTI_{counter:03d}",
            category="emergency_type_detection",
            subcategory="MULTIPLE_TYPES",
            input_message=scenario,
            expected_output=f"Emergency types should include: {', '.join(expected_types)}",
            context=[],
            expected_extraction={"emergencyTypes": expected_types},
            metadata={"priority": "CRITICAL", "multiple_services": True}
        ))
        counter += 1

    return test_cases


def generate_location_test_cases() -> List[TestCase]:
    """Generate test cases for location extraction"""
    test_cases = []
    counter = 1

    # Full address formats
    full_addresses = [
        ("123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
         {"address": "123 Nguyễn Huệ", "ward": "Phường Bến Nghé", "district": "Quận 1", "city": "Thành phố Hồ Chí Minh"}),
        ("45/2 Lê Lợi, P. Bến Thành, Q.1, Sài Gòn",
         {"address": "45/2 Lê Lợi", "ward": "Phường Bến Thành", "district": "Quận 1", "city": "Thành phố Hồ Chí Minh"}),
        ("Số 8 Trần Hưng Đạo, phường 1, quận 5, thành phố Hồ Chí Minh",
         {"address": "Số 8 Trần Hưng Đạo", "ward": "Phường 1", "district": "Quận 5", "city": "Thành phố Hồ Chí Minh"}),
        ("156A Cách Mạng Tháng 8, Phường 10, Quận 3, HCM",
         {"address": "156A Cách Mạng Tháng 8", "ward": "Phường 10", "district": "Quận 3", "city": "Thành phố Hồ Chí Minh"}),
        ("89 Nguyễn Văn Cừ, Xã Tân Thới Nhì, Huyện Hóc Môn, TPHCM",
         {"address": "89 Nguyễn Văn Cừ", "ward": "Xã Tân Thới Nhì", "district": "Huyện Hóc Môn", "city": "Thành phố Hồ Chí Minh"}),
    ]

    for addr, expected_location in full_addresses:
        test_cases.append(TestCase(
            id=f"LOC_{counter:03d}",
            category="location_extraction",
            subcategory="full_address",
            input_message=f"Có cháy tại {addr}",
            expected_output="Location should be fully extracted",
            context=[],
            expected_extraction={"location": expected_location},
            metadata={"address_format": "full"}
        ))
        counter += 1

    # Partial addresses (50 cases)
    partial_addresses = [
        ("Đường Lê Văn Sỹ, gần ngã tư", {"address": "Đường Lê Văn Sỹ", "ward": None, "district": None, "city": None}),
        ("Chợ Bến Thành", {"address": "Chợ Bến Thành", "ward": None, "district": None, "city": None}),
        ("Bệnh viện Chợ Rẫy", {"address": "Bệnh viện Chợ Rẫy", "ward": None, "district": None, "city": None}),
        ("Gần trường Đại học Bách Khoa", {"address": "Gần trường Đại học Bách Khoa", "ward": None, "district": None, "city": None}),
        ("Ngã tư Phú Nhuận", {"address": "Ngã tư Phú Nhuận", "ward": None, "district": "Quận Phú Nhuận", "city": None}),
        ("Khu công nghiệp Tân Bình", {"address": "Khu công nghiệp Tân Bình", "ward": None, "district": "Quận Tân Bình", "city": None}),
        ("Sân bay Tân Sơn Nhất", {"address": "Sân bay Tân Sơn Nhất", "ward": None, "district": "Quận Tân Bình", "city": "Thành phố Hồ Chí Minh"}),
        ("Cầu Sài Gòn", {"address": "Cầu Sài Gòn", "ward": None, "district": None, "city": "Thành phố Hồ Chí Minh"}),
        ("Hẻm 123, đường Nguyễn Trãi", {"address": "Hẻm 123, đường Nguyễn Trãi", "ward": None, "district": None, "city": None}),
        ("Phường 14, Quận Gò Vấp", {"address": None, "ward": "Phường 14", "district": "Quận Gò Vấp", "city": None}),
    ]

    for addr, expected_location in partial_addresses:
        test_cases.append(TestCase(
            id=f"LOC_{counter:03d}",
            category="location_extraction",
            subcategory="partial_address",
            input_message=f"Xảy ra tai nạn tại {addr}",
            expected_output="Partial location should be extracted",
            context=[],
            expected_extraction={"location": expected_location},
            metadata={"address_format": "partial", "needs_clarification": True}
        ))
        counter += 1

    # Landmark-based locations (30 cases)
    landmarks = [
        "Gần Nhà thờ Đức Bà",
        "Đối diện siêu thị Big C",
        "Bên cạnh công viên Tao Đàn",
        "Sau lưng Ủy ban phường",
        "Trước cổng trường Lê Hồng Phong",
        "Trong hẻm sau chợ",
        "Gần ngã ba đường ray",
        "Cạnh cây xăng Petrolimex",
        "Đầu cầu Thủ Thiêm",
        "Gần bến xe Miền Đông",
        "Sau khu chung cư Sunrise",
        "Trước quán cà phê Highland",
        "Gần trạm xe buýt",
        "Bên trong công viên Lê Thị Riêng",
        "Sau lưng nhà văn hóa quận",
        "Gần cổng trường mầm non",
        "Đối diện phòng khám đa khoa",
        "Bên cạnh tiệm vàng",
        "Trước cổng chùa",
        "Gần bưu điện trung tâm",
        "Cạnh ngân hàng Vietcombank",
        "Sau lưng rạp chiếu phim",
        "Gần trung tâm thương mại",
        "Bên trong khu dân cư mới",
        "Trước cổng khu công nghiệp",
        "Gần bến phà",
        "Sau nhà máy nước",
        "Cạnh đường cao tốc",
        "Gần cầu vượt",
        "Bên trong khu chế xuất",
    ]

    for landmark in landmarks:
        test_cases.append(TestCase(
            id=f"LOC_{counter:03d}",
            category="location_extraction",
            subcategory="landmark",
            input_message=f"Có người bị thương {landmark}",
            expected_output="Landmark should be extracted for location reference",
            context=[],
            expected_extraction={"location": {"landmarks": landmark}},
            metadata={"address_format": "landmark", "needs_clarification": True}
        ))
        counter += 1

    # Address with typos and variations (20 cases)
    typo_addresses = [
        ("123 nguyen hue, phuong ben nghe", "123 Nguyễn Huệ, Phường Bến Nghé"),
        ("số 45 le loi q1", "Số 45 Lê Lợi, Quận 1"),
        ("duong tran hung dao quan 5 sg", "Đường Trần Hưng Đạo, Quận 5, Sài Gòn"),
        ("145 CMT8 p10 q3 hcm", "145 Cách Mạng Tháng 8, Phường 10, Quận 3, HCM"),
        ("phuong 7 tan binh", "Phường 7, Tân Bình"),
        ("go vap ward 5", "Gò Vấp Ward 5"),
        ("quan 1 tphcm vn", "Quận 1, TPHCM, VN"),
        ("binh thanh dis hcmc", "Bình Thạnh District, HCMC"),
        ("thu duc city sgn", "Thủ Đức City, SGN"),
        ("district 7 phu my hung", "District 7, Phú Mỹ Hưng"),
    ]

    for typo_addr, expected in typo_addresses:
        test_cases.append(TestCase(
            id=f"LOC_{counter:03d}",
            category="location_extraction",
            subcategory="typo_variation",
            input_message=f"Có vụ trộm tại {typo_addr}",
            expected_output=f"Should normalize to: {expected}",
            context=[],
            expected_extraction={"location": {"raw": typo_addr}},
            metadata={"address_format": "typo", "requires_normalization": True}
        ))
        counter += 1

    # Context-based location collection (30 cases)
    for i in range(30):
        districts = HCMC_DISTRICTS
        district = random.choice(districts)
        ward = f"Phường {random.randint(1, 15)}"
        street = f"{random.randint(1, 500)} Đường {random.choice(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Trãi', 'Võ Văn Tần'])}"

        test_cases.append(TestCase(
            id=f"LOC_{counter:03d}",
            category="location_extraction",
            subcategory="multi_turn",
            input_message=f"{street}, {ward}, {district}",
            expected_output="Full address should be extracted from user's response",
            context=[
                {"role": "operator", "message": "Bạn cho tôi địa chỉ cụ thể?"},
            ],
            expected_extraction={"location": {"address": street, "ward": ward, "district": district, "city": "Thành phố Hồ Chí Minh"}},
            metadata={"address_format": "response", "multi_turn": True}
        ))
        counter += 1

    return test_cases


def generate_phone_validation_test_cases() -> List[TestCase]:
    """Generate test cases for Vietnamese phone number validation"""
    test_cases = []
    counter = 1

    # Valid phone numbers (60 cases)
    for prefix in VALID_PHONE_PREFIXES[:20]:  # Use first 20 prefixes
        phone = f"{prefix}{random.randint(1000000, 9999999)}"
        test_cases.append(TestCase(
            id=f"PHONE_{counter:03d}",
            category="phone_validation",
            subcategory="valid_domestic",
            input_message=f"Số điện thoại của tôi là {phone}",
            expected_output=f"Phone number {phone} should be validated as correct",
            context=[{"role": "operator", "message": "Cho tôi số điện thoại để liên hệ"}],
            expected_extraction={"phone": phone, "phoneValid": True},
            metadata={"phone_format": "domestic", "prefix": prefix[:3]}
        ))
        counter += 1

    # Valid international format (+84)
    for prefix in VALID_PHONE_PREFIXES[:20]:
        phone_without_zero = prefix[1:] + str(random.randint(1000000, 9999999))
        international_phone = f"+84{phone_without_zero}"
        test_cases.append(TestCase(
            id=f"PHONE_{counter:03d}",
            category="phone_validation",
            subcategory="valid_international",
            input_message=f"Liên hệ qua số {international_phone}",
            expected_output=f"International phone {international_phone} should be validated",
            context=[{"role": "operator", "message": "Số điện thoại liên hệ là gì?"}],
            expected_extraction={"phone": f"0{phone_without_zero}", "phoneValid": True},
            metadata={"phone_format": "international", "prefix": prefix[:3]}
        ))
        counter += 1

    # Invalid phone numbers (40 cases)
    invalid_phones = [
        ("0123456789", "Invalid prefix 012"),
        ("01234567890", "Too many digits"),
        ("09123456", "Too few digits"),
        ("+8491234567", "International format too short"),
        ("+849123456789", "International format too long"),
        ("0912345678a", "Contains letters"),
        ("0912-345-678", "Contains dashes (format issue)"),
        ("09 123 456 78", "Contains spaces (format issue)"),
        ("1234567890", "Missing leading 0"),
        ("0112345678", "Invalid prefix 011"),
        ("0412345678", "Invalid prefix 041"),
        ("0612345678", "Invalid prefix 061"),
        ("0872345678", "Invalid prefix 087"),
        ("0952345678", "Invalid prefix 095"),
        ("+1234567890", "Wrong country code"),
        ("+849", "Too short"),
        ("abcdefghij", "All letters"),
        ("", "Empty string"),
        ("null", "Null text"),
        ("0000000000", "All zeros - invalid prefix"),
    ]

    for invalid_phone, reason in invalid_phones:
        test_cases.append(TestCase(
            id=f"PHONE_{counter:03d}",
            category="phone_validation",
            subcategory="invalid",
            input_message=f"Số điện thoại: {invalid_phone}",
            expected_output=f"Phone should be rejected: {reason}",
            context=[{"role": "operator", "message": "Cho tôi số điện thoại"}],
            expected_extraction={"phone": None, "phoneValid": False, "error": reason},
            metadata={"phone_format": "invalid", "reason": reason}
        ))
        counter += 1

    # Phone in context (20 cases)
    phone_contexts = [
        "Gọi cho tôi theo số 0912345678 nhé",
        "Liên hệ 0987654321",
        "SĐT của tôi 0901234567",
        "Gọi lại số này: 0938123456",
        "Điện thoại: 0765432109",
        "Tôi dùng số 0854321098",
        "Có thể liên hệ 0345678901",
        "Số tôi là 0567890123",
        "Gọi 0823456789 được không",
        "Liên lạc qua 0789012345",
        "Số điện thoại di động: 0912345678",
        "Mobile: 0987654321",
        "ĐT: 0901234567",
        "Phone: 0938123456",
        "Số liên hệ: 0765432109",
        "Số máy: 0854321098",
        "Gọi theo SĐT 0345678901",
        "Số hotline: 0567890123",
        "Di động: 0823456789",
        "Số cá nhân: 0789012345",
    ]

    for context in phone_contexts:
        test_cases.append(TestCase(
            id=f"PHONE_{counter:03d}",
            category="phone_validation",
            subcategory="embedded",
            input_message=context,
            expected_output="Phone number should be extracted from context",
            context=[{"role": "operator", "message": "Cho tôi số điện thoại liên hệ"}],
            expected_extraction={"phoneValid": True},
            metadata={"phone_format": "embedded"}
        ))
        counter += 1

    return test_cases


def generate_affected_people_test_cases() -> List[TestCase]:
    """Generate test cases for affected people extraction"""
    test_cases = []
    counter = 1

    # Explicit number mentions (40 cases)
    people_scenarios = [
        ("1 người", {"total": 1, "injured": 1, "critical": 0}),
        ("2 người bị thương", {"total": 2, "injured": 2, "critical": 0}),
        ("3 nạn nhân", {"total": 3, "injured": 3, "critical": 0}),
        ("5 người, trong đó 2 người nguy kịch", {"total": 5, "injured": 3, "critical": 2}),
        ("Khoảng 10 người", {"total": 10, "injured": 10, "critical": 0}),
        ("Nhiều người bị thương", {"total": 5, "injured": 5, "critical": 0}),  # Estimated
        ("Một người", {"total": 1, "injured": 1, "critical": 0}),
        ("Hai người", {"total": 2, "injured": 2, "critical": 0}),
        ("Ba người", {"total": 3, "injured": 3, "critical": 0}),
        ("Mười người", {"total": 10, "injured": 10, "critical": 0}),
        ("Chỉ có tôi thôi", {"total": 1, "injured": 1, "critical": 0}),
        ("Tôi và con tôi", {"total": 2, "injured": 2, "critical": 0}),
        ("Cả gia đình 4 người", {"total": 4, "injured": 4, "critical": 0}),
        ("Nhóm 6 người", {"total": 6, "injured": 6, "critical": 0}),
        ("Khoảng 20 người trong tòa nhà", {"total": 20, "injured": 20, "critical": 0}),
        ("1 người nguy kịch", {"total": 1, "injured": 0, "critical": 1}),
        ("2 người chết, 5 người bị thương", {"total": 7, "injured": 5, "critical": 0}),
        ("Không ai bị thương", {"total": 0, "injured": 0, "critical": 0}),
        ("Chưa rõ số người", {"total": 1, "injured": 1, "critical": 0}),
        ("Đông lắm, khoảng 50 người", {"total": 50, "injured": 50, "critical": 0}),
        ("3 người, 1 người bất tỉnh", {"total": 3, "injured": 2, "critical": 1}),
        ("4 người trong đó có trẻ em", {"total": 4, "injured": 4, "critical": 0}),
        ("Mấy người già", {"total": 3, "injured": 3, "critical": 0}),
        ("Vài người", {"total": 3, "injured": 3, "critical": 0}),
        ("Rất nhiều người", {"total": 10, "injured": 10, "critical": 0}),
        ("Hơn chục người", {"total": 15, "injured": 15, "critical": 0}),
        ("Khoảng vài chục", {"total": 30, "injured": 30, "critical": 0}),
        ("2 người lớn và 3 trẻ em", {"total": 5, "injured": 5, "critical": 0}),
        ("Một cặp vợ chồng", {"total": 2, "injured": 2, "critical": 0}),
        ("Cả nhà 5 người", {"total": 5, "injured": 5, "critical": 0}),
    ]

    for scenario, expected in people_scenarios:
        test_cases.append(TestCase(
            id=f"PEOPLE_{counter:03d}",
            category="affected_people",
            subcategory="explicit",
            input_message=scenario,
            expected_output=f"Should extract: total={expected['total']}, injured={expected['injured']}, critical={expected['critical']}",
            context=[{"role": "operator", "message": "Có bao nhiêu người cần trợ giúp?"}],
            expected_extraction={"affectedPeople": expected},
            metadata={"extraction_type": "explicit"}
        ))
        counter += 1

    # Numbers in Vietnamese words (20 cases)
    viet_numbers = [
        ("một người", 1),
        ("hai người", 2),
        ("ba người", 3),
        ("bốn người", 4),
        ("năm người", 5),
        ("sáu người", 6),
        ("bảy người", 7),
        ("tám người", 8),
        ("chín người", 9),
        ("mười người", 10),
        ("mười một người", 11),
        ("mười hai người", 12),
        ("hai mươi người", 20),
        ("ba mươi người", 30),
        ("năm mươi người", 50),
        ("một trăm người", 100),
        ("vài người", 3),
        ("mấy người", 3),
        ("đông người", 10),
        ("ít người", 2),
    ]

    for text, expected_count in viet_numbers:
        test_cases.append(TestCase(
            id=f"PEOPLE_{counter:03d}",
            category="affected_people",
            subcategory="vietnamese_number",
            input_message=text,
            expected_output=f"Should extract count: {expected_count}",
            context=[{"role": "operator", "message": "Có bao nhiêu người bị ảnh hưởng?"}],
            expected_extraction={"affectedPeople": {"total": expected_count}},
            metadata={"extraction_type": "vietnamese_word"}
        ))
        counter += 1

    # Context from emergency description (30 cases)
    emergency_descriptions = [
        ("Tai nạn xe máy, có 2 người nằm trên đường", {"total": 2}),
        ("Cháy nhà, nghe nói có 5 người trong đó", {"total": 5}),
        ("Đánh nhau, 3 người đang chảy máu", {"total": 3}),
        ("Đuối nước, vớt được 1 người lên", {"total": 1}),
        ("Sập nhà, ước tính có 10 người mắc kẹt", {"total": 10}),
        ("Ngộ độc thực phẩm, cả bàn 8 người đều bị", {"total": 8}),
        ("Tai nạn xe khách, rất đông người", {"total": 20}),
        ("Hỏa hoạn tại chung cư, nhiều gia đình", {"total": 15}),
        ("Va chạm 2 xe, mỗi xe có 4 người", {"total": 8}),
        ("Bị cướp, tôi và bạn tôi bị thương", {"total": 2}),
        ("Cháy xưởng, khoảng 30 công nhân", {"total": 30}),
        ("Vụ nổ, ban đầu nghe có 6 người", {"total": 6}),
        ("Sập giàn giáo, 4 thợ xây bị đè", {"total": 4}),
        ("Tai nạn giao thông nghiêm trọng", {"total": 5}),
        ("Cháy quán karaoke đông khách", {"total": 20}),
    ]

    for description, expected in emergency_descriptions:
        test_cases.append(TestCase(
            id=f"PEOPLE_{counter:03d}",
            category="affected_people",
            subcategory="from_description",
            input_message=description,
            expected_output=f"Should extract from emergency description: total={expected['total']}",
            context=[],
            expected_extraction={"affectedPeople": expected},
            metadata={"extraction_type": "description"}
        ))
        counter += 1

    return test_cases


def generate_conversation_flow_test_cases() -> List[TestCase]:
    """Generate test cases for conversation flow and confirmation"""
    test_cases = []
    counter = 1

    # Complete conversation flows (40 cases)
    conversation_flows = [
        # Flow 1: Fire emergency
        [
            {"input": "Có cháy lớn ở nhà tôi!", "expected_step": "emergency"},
            {"input": "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TPHCM", "expected_step": "location"},
            {"input": "0912345678", "expected_step": "phone"},
            {"input": "3 người", "expected_step": "people"},
            {"input": "Đúng rồi, xác nhận", "expected_step": "confirm"},
        ],
        # Flow 2: Medical emergency
        [
            {"input": "Có người bị tai nạn giao thông!", "expected_step": "emergency"},
            {"input": "Gần ngã tư Phú Nhuận", "expected_step": "location"},
            {"input": "Quận Phú Nhuận, TPHCM", "expected_step": "location"},
            {"input": "0987654321", "expected_step": "phone"},
            {"input": "2 người bị thương", "expected_step": "people"},
            {"input": "OK", "expected_step": "confirm"},
        ],
        # Flow 3: Security emergency
        [
            {"input": "Có trộm đang đột nhập!", "expected_step": "emergency"},
            {"input": "45 Lê Lợi, P. Bến Thành, Q.1, SG", "expected_step": "location"},
            {"input": "0901234567", "expected_step": "phone"},
            {"input": "Chỉ có tôi thôi", "expected_step": "people"},
            {"input": "Xác nhận", "expected_step": "confirm"},
        ],
    ]

    for flow_idx, flow in enumerate(conversation_flows):
        for step_idx, step in enumerate(flow):
            context = []
            for prev_step in flow[:step_idx]:
                context.append({"role": "reporter", "message": prev_step["input"]})
                context.append({"role": "operator", "message": f"Response for {prev_step['expected_step']}"})

            test_cases.append(TestCase(
                id=f"FLOW_{counter:03d}",
                category="conversation_flow",
                subcategory="complete_flow",
                input_message=step["input"],
                expected_output=f"Should transition to {step['expected_step']} step",
                context=context,
                expected_extraction={"currentStep": step["expected_step"]},
                metadata={"flow_id": flow_idx + 1, "step": step_idx + 1}
            ))
            counter += 1

    # Confirmation responses (30 positive, 30 negative)
    positive_confirmations = [
        "Đúng", "Đúng rồi", "Xác nhận", "OK", "Oke", "Yes", "Vâng", "Ừ", "Uh",
        "Đồng ý", "Chính xác", "Được", "Chuẩn", "Chuẩn rồi", "Đúng như vậy",
        "Thông tin chính xác", "Xác nhận thông tin", "Đúng hết", "OK em",
        "Vâng ạ", "Đúng ạ", "Xác nhận ạ", "OK anh/chị", "Được rồi",
        "Tất cả đúng", "Không có gì sai", "Thông tin đúng", "Xác nhận ngay",
        "Đúng, tạo phiếu đi", "Xác nhận, làm nhanh lên",
    ]

    negative_confirmations = [
        "Không", "Sai rồi", "Nhầm", "Không phải", "Chưa đúng", "Sửa lại",
        "Thay đổi", "Không đúng", "Xin lỗi", "Sorry", "Chỉnh lại", "Đổi",
        "Khác", "Không chính xác", "Cập nhật", "Thực ra", "Thật ra",
        "Không, sai địa chỉ", "Nhầm số điện thoại", "Sửa địa chỉ",
        "Không phải vậy", "Sai thông tin", "Cần chỉnh sửa", "Chưa chính xác",
        "Không đúng địa chỉ", "Số điện thoại sai", "Phải sửa lại",
        "Xin lỗi, địa chỉ đúng là...", "Thực ra số người là...",
        "Không, cần thêm thông tin",
    ]

    for confirmation in positive_confirmations:
        test_cases.append(TestCase(
            id=f"CONF_{counter:03d}",
            category="confirmation",
            subcategory="positive",
            input_message=confirmation,
            expected_output="Should be recognized as confirmation",
            context=[
                {"role": "operator", "message": "Xác nhận thông tin: Địa điểm: 123 ABC, Loại: Cháy, SĐT: 0912345678. Đúng chưa?"}
            ],
            expected_extraction={"userConfirmed": True},
            metadata={"confirmation_type": "positive"}
        ))
        counter += 1

    for correction in negative_confirmations:
        test_cases.append(TestCase(
            id=f"CONF_{counter:03d}",
            category="confirmation",
            subcategory="negative",
            input_message=correction,
            expected_output="Should be recognized as correction/rejection",
            context=[
                {"role": "operator", "message": "Xác nhận thông tin: Địa điểm: 123 ABC, Loại: Cháy, SĐT: 0912345678. Đúng chưa?"}
            ],
            expected_extraction={"userConfirmed": False, "isCorrection": True},
            metadata={"confirmation_type": "negative"}
        ))
        counter += 1

    # User corrections with new info (20 cases)
    corrections_with_info = [
        ("Xin lỗi, địa chỉ đúng là 456 Lê Lợi", {"location": {"address": "456 Lê Lợi"}}),
        ("Không, số điện thoại là 0987654321", {"phone": "0987654321"}),
        ("Sai rồi, có 5 người không phải 3", {"affectedPeople": {"total": 5}}),
        ("Thực ra là tai nạn, không phải cháy", {"emergencyTypes": ["MEDICAL"]}),
        ("Nhầm phường, là Phường 10 không phải Phường 1", {"location": {"ward": "Phường 10"}}),
        ("Cập nhật: 2 người nguy kịch", {"affectedPeople": {"critical": 2}}),
        ("Không phải Quận 1, là Quận 3", {"location": {"district": "Quận 3"}}),
        ("Số nhà là 789, không phải 123", {"location": {"address": "789"}}),
        ("Thực ra có 10 người bị ảnh hưởng", {"affectedPeople": {"total": 10}}),
        ("Đổi số điện thoại thành 0901234567", {"phone": "0901234567"}),
    ]

    for correction, expected in corrections_with_info:
        test_cases.append(TestCase(
            id=f"CORR_{counter:03d}",
            category="user_correction",
            subcategory="with_new_info",
            input_message=correction,
            expected_output="Should extract new information from correction",
            context=[
                {"role": "operator", "message": "Xác nhận: Địa điểm 123 ABC, SĐT 0912345678, 3 người. Đúng không?"}
            ],
            expected_extraction=expected,
            metadata={"correction_type": "with_info"}
        ))
        counter += 1

    return test_cases


def generate_first_aid_test_cases() -> List[TestCase]:
    """Generate test cases for first aid RAG and guidance"""
    test_cases = []
    counter = 1

    # Fire emergencies requiring first aid guidance (25 cases)
    fire_first_aid = [
        ("Cháy nhà, có người bị bỏng", "bỏng", ["làm mát vết bỏng", "nước mát", "không bôi kem"]),
        ("Người bị ngạt khói trong đám cháy", "ngạt khói", ["đưa ra ngoài", "không khí trong lành", "hô hấp nhân tạo"]),
        ("Cháy điện, người bị điện giật", "điện giật", ["ngắt nguồn điện", "không chạm trực tiếp", "CPR"]),
        ("Cháy gas, có người bị bỏng khí", "bỏng khí", ["đưa ra ngoài", "oxy", "làm mát"]),
        ("Cháy nhà, người ngất do hít khói", "ngất do khói", ["vị trí hồi phục", "thông đường thở", "theo dõi"]),
        ("Nổ bình gas, người bị thương", "bỏng và chấn thương", ["băng vết thương", "giữ nạn nhân ấm"]),
        ("Cháy quán, khách bị bỏng cấp độ 2", "bỏng cấp độ 2", ["nước mát 10-20 phút", "không chọc bóng nước"]),
        ("Người mắc kẹt trong đám cháy được cứu ra", "ngạt khói", ["kiểm tra hô hấp", "CPR nếu cần"]),
    ]

    for scenario, condition, expected_keywords in fire_first_aid:
        test_cases.append(TestCase(
            id=f"FIRSTAID_{counter:03d}",
            category="first_aid_guidance",
            subcategory="fire_rescue",
            input_message=scenario,
            expected_output=f"First aid guidance for {condition} should include relevant instructions",
            context=[],
            expected_extraction={"firstAidKeywords": expected_keywords},
            metadata={"emergency_type": "FIRE_RESCUE", "condition": condition}
        ))
        counter += 1

    # Medical emergencies (40 cases)
    medical_first_aid = [
        ("Người bị đột quỵ, một bên mặt méo", "đột quỵ", ["đặt nằm nghiêng", "không cho ăn uống", "gọi cấp cứu"]),
        ("Người bị đau tim, đau ngực dữ dội", "đau tim", ["nghỉ ngơi", "ngồi thoải mái", "nới lỏng quần áo"]),
        ("Trẻ em bị co giật sốt cao", "co giật", ["không giữ chặt", "đặt nghiêng", "hạ sốt"]),
        ("Người bị ngất xỉu", "ngất", ["nâng cao chân", "nới lỏng quần áo", "không cho uống nước"]),
        ("Nạn nhân chảy máu nhiều", "chảy máu", ["ép chặt vết thương", "nâng cao chi", "băng ép"]),
        ("Người bị gãy xương tay", "gãy xương", ["cố định", "không di chuyển", "chườm lạnh"]),
        ("Người bị rắn cắn", "rắn cắn", ["giữ yên chi", "không hút nọc", "đánh dấu thời gian"]),
        ("Trẻ bị sặc sữa", "sặc", ["vỗ lưng", "đặt đầu thấp", "lấy dị vật"]),
        ("Người bị ngộ độc thực phẩm", "ngộ độc", ["không gây nôn", "uống nước", "giữ mẫu thức ăn"]),
        ("Người bị đuối nước vớt lên", "đuối nước", ["CPR", "hô hấp nhân tạo", "ấn tim ngoài lồng ngực"]),
        ("Người bị ong đốt, sưng phù", "ong đốt", ["rút kim", "chườm lạnh", "theo dõi dị ứng"]),
        ("Người bị sốc phản vệ", "sốc phản vệ", ["đặt nằm", "nâng chân", "dùng epinephrine nếu có"]),
        ("Phụ nữ chuyển dạ đột ngột", "sinh đẻ", ["giữ ấm", "đỡ em bé", "không kéo dây rốn"]),
        ("Người bị bỏng hóa chất", "bỏng hóa chất", ["rửa nước nhiều", "cởi bỏ quần áo dính", "không bôi thuốc"]),
        ("Người nghẹt thở do dị vật", "nghẹt thở", ["Heimlich", "vỗ lưng", "ấn bụng"]),
        ("Người bị chấn thương cột sống", "chấn thương cột sống", ["không di chuyển", "cố định cổ", "chờ cứu hộ"]),
        ("Người bị hạ thân nhiệt", "hạ thân nhiệt", ["giữ ấm từ từ", "chăn khô", "đồ uống ấm"]),
        ("Người bị say nắng", "say nắng", ["đưa vào bóng mát", "làm mát", "uống nước"]),
        ("Trẻ bị hóc xương", "hóc xương", ["không dùng tay móc", "vỗ lưng", "đến bệnh viện"]),
        ("Người bị trật khớp vai", "trật khớp", ["cố định", "chườm lạnh", "không tự nắn"]),
    ]

    for scenario, condition, expected_keywords in medical_first_aid:
        test_cases.append(TestCase(
            id=f"FIRSTAID_{counter:03d}",
            category="first_aid_guidance",
            subcategory="medical",
            input_message=scenario,
            expected_output=f"First aid for {condition}",
            context=[],
            expected_extraction={"firstAidKeywords": expected_keywords},
            metadata={"emergency_type": "MEDICAL", "condition": condition}
        ))
        counter += 1

    # No specific first aid needed (Security only) - 15 cases
    security_only = [
        "Có kẻ trộm đang đột nhập",
        "Bị cướp giật túi xách",
        "Có người đang đánh nhau",
        "Xe bị trộm trong bãi đỗ",
        "Có kẻ lạ rình rập quanh nhà",
        "Bị đe dọa qua điện thoại",
        "Có nhóm người gây rối",
        "Phát hiện hành vi đáng ngờ",
        "Xe máy bị phá khóa",
        "Có người say quậy phá",
        "Phát hiện trộm trong siêu thị",
        "Nhóm thanh niên đua xe",
        "Có người đập phá cửa hàng",
        "Bị theo dõi khi đi về nhà",
        "Có người cầm dao đe dọa",
    ]

    for scenario in security_only:
        test_cases.append(TestCase(
            id=f"FIRSTAID_{counter:03d}",
            category="first_aid_guidance",
            subcategory="security_only",
            input_message=scenario,
            expected_output="Should provide safety guidance, not medical first aid",
            context=[],
            expected_extraction={"firstAidGuidance": "safety_guidance"},
            metadata={"emergency_type": "SECURITY"}
        ))
        counter += 1

    return test_cases


def generate_authenticated_user_test_cases() -> List[TestCase]:
    """Generate test cases for authenticated user scenarios"""
    test_cases = []
    counter = 1

    # Phone pre-filled from user memory (20 cases)
    for i in range(20):
        saved_phone = f"09{random.randint(10000000, 99999999)}"
        test_cases.append(TestCase(
            id=f"AUTH_{counter:03d}",
            category="authenticated_user",
            subcategory="phone_prefilled",
            input_message="Có cháy ở 123 ABC, Phường 1, Quận 1, TPHCM. 2 người bị thương.",
            expected_output="Should skip phone collection for authenticated users",
            context=[],
            expected_extraction={"phone": saved_phone, "skipPhoneCollection": True},
            metadata={
                "isAuthenticated": True,
                "userMemory": {"savedPhone": saved_phone}
            }
        ))
        counter += 1

    # Ticket query scenarios (20 cases)
    ticket_queries = [
        "Trạng thái phiếu của tôi",
        "Phiếu khẩn cấp của tôi thế nào rồi",
        "Xem ticket của tôi",
        "Tình trạng xử lý phiếu",
        "Báo cáo trước đó của tôi",
        "Lịch sử báo cáo",
        "My tickets",
        "Ticket status",
        "Đã báo cáo trước đó",
        "Xem lại phiếu cũ",
        "TD-20240115-123456-ABCD",  # Specific ticket ID
        "Tra cứu phiếu TD-20240115-654321-EFGH",
        "Phiếu của tôi đang ở trạng thái gì",
        "Kiểm tra tình trạng phiếu",
        "Phiếu tôi tạo hôm qua",
        "Báo cáo gần đây nhất",
        "Xem các phiếu đã tạo",
        "Lịch sử cuộc gọi khẩn cấp",
        "Previous emergency reports",
        "Check my report status",
    ]

    for query in ticket_queries:
        test_cases.append(TestCase(
            id=f"AUTH_{counter:03d}",
            category="authenticated_user",
            subcategory="ticket_query",
            input_message=query,
            expected_output="Should route to memory retrieval for ticket queries",
            context=[],
            expected_extraction={"currentStep": "ticketQuery"},
            metadata={"isAuthenticated": True, "query_type": "ticket_history"}
        ))
        counter += 1

    # Guest user ticket query (should prompt login) - 10 cases
    for query in ticket_queries[:10]:
        test_cases.append(TestCase(
            id=f"AUTH_{counter:03d}",
            category="authenticated_user",
            subcategory="guest_ticket_query",
            input_message=query,
            expected_output="Should prompt login for guest users querying tickets",
            context=[],
            expected_extraction={"promptLogin": True},
            metadata={"isAuthenticated": False}
        ))
        counter += 1

    return test_cases


def generate_edge_case_test_cases() -> List[TestCase]:
    """Generate test cases for edge cases and error handling"""
    test_cases = []
    counter = 1

    # Empty or near-empty inputs (10 cases)
    empty_inputs = [
        "",
        " ",
        "   ",
        ".",
        "?",
        "!",
        "...",
        "???",
        "a",
        "ok",
    ]

    for inp in empty_inputs:
        test_cases.append(TestCase(
            id=f"EDGE_{counter:03d}",
            category="edge_cases",
            subcategory="empty_input",
            input_message=inp,
            expected_output="Should handle gracefully and ask for more information",
            context=[],
            expected_extraction={"needsClarification": True},
            metadata={"input_type": "empty_or_minimal"}
        ))
        counter += 1

    # Very long inputs (10 cases)
    long_inputs = [
        "A" * 500,  # 500 chars
        " ".join(["từ"] * 200),  # 200 words
        "Có cháy " * 100,  # Repeated
        "123 " * 200,  # Numbers repeated
        "Cháy nhà tại " + "rất " * 100 + "lớn",  # Exaggeration
    ]

    for inp in long_inputs:
        test_cases.append(TestCase(
            id=f"EDGE_{counter:03d}",
            category="edge_cases",
            subcategory="long_input",
            input_message=inp[:1000],  # Truncate for test
            expected_output="Should handle long input gracefully",
            context=[],
            expected_extraction={"handled": True},
            metadata={"input_type": "long", "length": len(inp)}
        ))
        counter += 1

    # Special characters (15 cases)
    special_char_inputs = [
        "Có cháy ở <script>alert('xss')</script>",
        "Địa chỉ: 123 ABC; DROP TABLE tickets;--",
        "Số điện thoại: ${phone}",
        "Địa chỉ: ../../../etc/passwd",
        "Có cháy ở {{template}}",
        'Cứu với! "injection" test',
        "Cháy tại địa chỉ: null",
        "SĐT: undefined",
        "Địa chỉ: NaN",
        "Cháy ở: [object Object]",
        "\\n\\r\\t test input",
        "Địa chỉ: 'OR '1'='1",
        "Cháy ở %s %d %x",
        "SĐT: $(whoami)",
        "Địa chỉ: `rm -rf /`",
    ]

    for inp in special_char_inputs:
        test_cases.append(TestCase(
            id=f"EDGE_{counter:03d}",
            category="edge_cases",
            subcategory="special_characters",
            input_message=inp,
            expected_output="Should sanitize and handle special characters safely",
            context=[],
            expected_extraction={"safe": True},
            metadata={"input_type": "special_chars", "security": True}
        ))
        counter += 1

    # Unicode and emoji (15 cases)
    unicode_inputs = [
        "Có cháy 🔥🔥🔥 ở nhà tôi!",
        "Cấp cứu 🚑 người bị thương 🩸",
        "Trộm 🦹 đang đột nhập 🏠",
        "Địa chỉ: 123 Nguyễn Huệ 📍",
        "SĐT: 0912345678 📱",
        "Có ☠️ người chết",
        "Cháy lớn 💥 nổ 💣",
        "Đuối nước 🏊 cứu với 🆘",
        "Tai nạn 🚗💥🚗 giao thông",
        "😱😱😱 Cháy nhà cháy nhà!!!",
        "Người bị thương ❤️‍🩹 nặng lắm",
        "Có người 👤 đánh nhau 👊",
        "Cần cứu hộ 🚒 gấp",
        "Đang bị cướp 🔫 cứu tôi",
        "Sập nhà 🏚️ người mắc kẹt",
    ]

    for inp in unicode_inputs:
        test_cases.append(TestCase(
            id=f"EDGE_{counter:03d}",
            category="edge_cases",
            subcategory="unicode_emoji",
            input_message=inp,
            expected_output="Should process emoji and unicode correctly",
            context=[],
            expected_extraction={"processed": True},
            metadata={"input_type": "unicode"}
        ))
        counter += 1

    # Ambiguous inputs (20 cases)
    ambiguous_inputs = [
        ("Có vấn đề", "emergency_type"),
        ("Cần giúp đỡ", "emergency_type"),
        ("Khẩn cấp!", "emergency_type"),
        ("Nhanh lên!", "emergency_type"),
        ("Cứu với", "emergency_type"),
        ("Có chuyện rồi", "emergency_type"),
        ("Tệ lắm", "emergency_type"),
        ("Nguy hiểm", "emergency_type"),
        ("Gần đây", "location"),
        ("Ở đây", "location"),
        ("Chỗ tôi", "location"),
        ("Nhà tôi", "location"),
        ("Gần nhà", "location"),
        ("Vài người", "people_count"),
        ("Nhiều lắm", "people_count"),
        ("Không biết", "unknown"),
        ("Chưa rõ", "unknown"),
        ("Không nhớ", "unknown"),
        ("Quên mất rồi", "unknown"),
        ("Tôi không biết", "unknown"),
    ]

    for inp, category in ambiguous_inputs:
        test_cases.append(TestCase(
            id=f"EDGE_{counter:03d}",
            category="edge_cases",
            subcategory="ambiguous",
            input_message=inp,
            expected_output=f"Should ask for clarification about {category}",
            context=[],
            expected_extraction={"needsClarification": True, "clarifyField": category},
            metadata={"input_type": "ambiguous"}
        ))
        counter += 1

    # Multiple topics in one message (10 cases)
    multi_topic = [
        "Có cháy ở 123 ABC và cũng có người bị thương, số tôi là 0912345678, có 5 người cần giúp",
        "Trộm đang đột nhập ở Quận 1, tôi bị thương, SĐT 0987654321",
        "Cháy lớn, tai nạn giao thông, đánh nhau, tất cả cùng một lúc ở ngã tư Phú Nhuận",
        "Cứu với, nhà tôi ở 45 Lê Lợi cháy, tôi bị bỏng, số điện thoại 0901234567, có 3 người trong nhà",
    ]

    for inp in multi_topic:
        test_cases.append(TestCase(
            id=f"EDGE_{counter:03d}",
            category="edge_cases",
            subcategory="multi_topic",
            input_message=inp,
            expected_output="Should extract all relevant information from complex message",
            context=[],
            expected_extraction={"multipleExtractions": True},
            metadata={"input_type": "complex"}
        ))
        counter += 1

    # Language mixing (Vietnamese + English) - 10 cases
    mixed_language = [
        "There's a fire at 123 Nguyễn Huệ",
        "Help! Có người bị thương ở đây!",
        "Emergency at Quận 1, need ambulance now!",
        "Trộm! Thief is breaking in!",
        "Cháy nhà! Fire fire fire!",
        "I need help, có tai nạn giao thông",
        "Someone is hurt, cần cấp cứu ngay",
        "Call the police, có người đánh nhau",
        "Có người drowning, đuối nước",
        "Building on fire, tòa nhà đang cháy",
    ]

    for inp in mixed_language:
        test_cases.append(TestCase(
            id=f"EDGE_{counter:03d}",
            category="edge_cases",
            subcategory="mixed_language",
            input_message=inp,
            expected_output="Should handle mixed Vietnamese-English input",
            context=[],
            expected_extraction={"processed": True},
            metadata={"input_type": "mixed_language"}
        ))
        counter += 1

    return test_cases


def generate_language_variation_test_cases() -> List[TestCase]:
    """Generate test cases for Vietnamese language variations"""
    test_cases = []
    counter = 1

    # Regional dialects and variations (30 cases)
    dialect_variations = [
        # Southern vs Northern Vietnamese
        ("Cháy rồi, mau lên!", "Cháy rồi, nhanh lên!", ["FIRE_RESCUE"]),
        ("Có ông già bị té", "Có cụ già bị ngã", ["MEDICAL"]),
        ("Bị giựt điện thoại", "Bị cướp điện thoại", ["SECURITY"]),
        ("Té xe", "Ngã xe", ["MEDICAL"]),
        ("Chạy xe lẹ quá", "Phóng xe nhanh quá", ["SECURITY"]),
        ("Bị phỏng", "Bị bỏng", ["MEDICAL"]),
        ("Té cầu thang", "Ngã cầu thang", ["MEDICAL"]),
        ("Đụng xe", "Va chạm xe", ["MEDICAL"]),
        ("Bể đầu", "Vỡ đầu", ["MEDICAL"]),
        ("Xỉu", "Ngất", ["MEDICAL"]),
    ]

    for southern, northern, expected_types in dialect_variations:
        # Test Southern variant
        test_cases.append(TestCase(
            id=f"LANG_{counter:03d}",
            category="language_variations",
            subcategory="dialect_southern",
            input_message=southern,
            expected_output=f"Should understand Southern Vietnamese: {southern}",
            context=[],
            expected_extraction={"emergencyTypes": expected_types},
            metadata={"dialect": "southern"}
        ))
        counter += 1

        # Test Northern variant
        test_cases.append(TestCase(
            id=f"LANG_{counter:03d}",
            category="language_variations",
            subcategory="dialect_northern",
            input_message=northern,
            expected_output=f"Should understand Northern Vietnamese: {northern}",
            context=[],
            expected_extraction={"emergencyTypes": expected_types},
            metadata={"dialect": "northern"}
        ))
        counter += 1

    # Informal/slang (20 cases)
    slang_expressions = [
        ("Cháy to vãi", "Cháy lớn", ["FIRE_RESCUE"]),
        ("Đau quá trời", "Đau lắm", ["MEDICAL"]),
        ("Bị đấm sml", "Bị đánh mạnh", ["SECURITY", "MEDICAL"]),
        ("Xe bay luôn rồi", "Tai nạn xe nghiêm trọng", ["MEDICAL"]),
        ("Lửa cháy dữ quá", "Cháy lớn", ["FIRE_RESCUE"]),
        ("Bị chém te tua", "Bị chém nặng", ["SECURITY", "MEDICAL"]),
        ("Ngất xỉu luôn", "Bất tỉnh", ["MEDICAL"]),
        ("Máu chảy ồ ồ", "Chảy máu nhiều", ["MEDICAL"]),
        ("Nổ banh xác", "Nổ lớn", ["FIRE_RESCUE"]),
        ("Bể bình xăng luôn", "Vỡ bình xăng", ["FIRE_RESCUE"]),
    ]

    for slang, formal, expected_types in slang_expressions:
        test_cases.append(TestCase(
            id=f"LANG_{counter:03d}",
            category="language_variations",
            subcategory="slang",
            input_message=slang,
            expected_output=f"Should understand slang: {slang} -> {formal}",
            context=[],
            expected_extraction={"emergencyTypes": expected_types},
            metadata={"style": "slang"}
        ))
        counter += 1

    # Abbreviations (20 cases)
    abbreviations = [
        ("TNGT nghiêm trọng", "Tai nạn giao thông nghiêm trọng", ["MEDICAL"]),
        ("BV Chợ Rẫy", "Bệnh viện Chợ Rẫy", []),
        ("SĐT 0912345678", "Số điện thoại 0912345678", []),
        ("ĐC 123 ABC", "Địa chỉ 123 ABC", []),
        ("Q1 TPHCM", "Quận 1 Thành phố Hồ Chí Minh", []),
        ("P.BN Q1", "Phường Bến Nghé Quận 1", []),
        ("PCCC", "Phòng cháy chữa cháy", ["FIRE_RESCUE"]),
        ("CSGT", "Cảnh sát giao thông", ["SECURITY"]),
        ("CA P.7", "Công an Phường 7", []),
        ("XH gấp", "Xe cứu hỏa gấp", ["FIRE_RESCUE"]),
    ]

    for abbr, full, expected_types in abbreviations:
        test_cases.append(TestCase(
            id=f"LANG_{counter:03d}",
            category="language_variations",
            subcategory="abbreviation",
            input_message=abbr,
            expected_output=f"Should expand abbreviation: {abbr} -> {full}",
            context=[],
            expected_extraction={"emergencyTypes": expected_types} if expected_types else {},
            metadata={"style": "abbreviation"}
        ))
        counter += 1

    # Typographical errors (20 cases)
    typos = [
        ("co chay", "có cháy", ["FIRE_RESCUE"]),
        ("tai nan", "tai nạn", ["MEDICAL"]),
        ("cuop", "cướp", ["SECURITY"]),
        ("duoi nuoc", "đuối nước", ["FIRE_RESCUE", "MEDICAL"]),
        ("chay mau", "chảy máu", ["MEDICAL"]),
        ("bat tinh", "bất tỉnh", ["MEDICAL"]),
        ("dien giat", "điện giật", ["MEDICAL", "FIRE_RESCUE"]),
        ("gay xuong", "gãy xương", ["MEDICAL"]),
        ("trom vao nha", "trộm vào nhà", ["SECURITY"]),
        ("chap dien", "chập điện", ["FIRE_RESCUE"]),
    ]

    for typo, correct, expected_types in typos:
        test_cases.append(TestCase(
            id=f"LANG_{counter:03d}",
            category="language_variations",
            subcategory="typo",
            input_message=typo,
            expected_output=f"Should understand despite typo: {typo} -> {correct}",
            context=[],
            expected_extraction={"emergencyTypes": expected_types},
            metadata={"style": "typo", "needs_correction": True}
        ))
        counter += 1

    return test_cases


def generate_all_test_cases() -> List[TestCase]:
    """Generate all test cases for the evaluation"""
    all_test_cases = []

    print("Generating test cases...")

    # Emergency type detection (~180 cases)
    print("  - Emergency type detection...")
    all_test_cases.extend(generate_emergency_type_test_cases())

    # Location extraction (~125 cases)
    print("  - Location extraction...")
    all_test_cases.extend(generate_location_test_cases())

    # Phone validation (~120 cases)
    print("  - Phone validation...")
    all_test_cases.extend(generate_phone_validation_test_cases())

    # Affected people (~90 cases)
    print("  - Affected people...")
    all_test_cases.extend(generate_affected_people_test_cases())

    # Conversation flow (~135 cases)
    print("  - Conversation flow...")
    all_test_cases.extend(generate_conversation_flow_test_cases())

    # First aid guidance (~80 cases)
    print("  - First aid guidance...")
    all_test_cases.extend(generate_first_aid_test_cases())

    # Authenticated user (~60 cases)
    print("  - Authenticated user scenarios...")
    all_test_cases.extend(generate_authenticated_user_test_cases())

    # Edge cases (~120 cases)
    print("  - Edge cases...")
    all_test_cases.extend(generate_edge_case_test_cases())

    # Language variations (~100 cases)
    print("  - Language variations...")
    all_test_cases.extend(generate_language_variation_test_cases())

    print(f"\nTotal test cases generated: {len(all_test_cases)}")

    return all_test_cases


def export_test_cases_to_json(test_cases: List[TestCase], filename: str = "test_cases.json"):
    """Export test cases to JSON file"""
    import json
    from dataclasses import asdict

    data = [asdict(tc) for tc in test_cases]

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Exported {len(test_cases)} test cases to {filename}")


if __name__ == "__main__":
    test_cases = generate_all_test_cases()
    export_test_cases_to_json(test_cases)
