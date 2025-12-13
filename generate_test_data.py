#!/usr/bin/env python3
"""
Generate 5000 test scenarios for 112 Emergency Call Center Chatbot Evaluation
This script creates diverse test cases covering all emergency types, edge cases, and conversation patterns.
"""

import csv
import random
from typing import List, Tuple

# Vietnamese cities/provinces
CITIES = [
    "TP.HCM", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng", "Biên Hòa",
    "Nha Trang", "Huế", "Buôn Ma Thuột", "Vũng Tàu", "Thái Nguyên",
    "Nam Định", "Quy Nhơn", "Vinh", "Đà Lạt", "Mỹ Tho", "Long Xuyên",
    "Pleiku", "Phan Thiết", "Bạc Liêu", "Cà Mau", "Rạch Giá", "Tây Ninh",
    "Thủ Dầu Một", "Biên Hòa", "Bắc Ninh", "Hạ Long", "Thanh Hóa",
    "Thành phố Hồ Chí Minh", "Thành phố Hà Nội", "TP Đà Nẵng"
]

# Districts/Wards for major cities
WARDS_HCMC = [
    "Phường Bến Nghé, Quận 1", "Phường Bến Thành, Quận 1", "Phường Đa Kao, Quận 1",
    "Phường 1, Quận 3", "Phường 2, Quận 3", "Phường 10, Quận 3",
    "Phường 1, Quận 4", "Phường 2, Quận 5", "Phường Linh Trung, TP Thủ Đức",
    "Phường Tân Bình, Quận Tân Bình", "Phường 12, Quận Gò Vấp",
    "Phường Bình Thạnh, Quận Bình Thạnh", "Phường An Phú, TP Thủ Đức",
    "Phường Thảo Điền, TP Thủ Đức", "Phường Tân Phú, Quận 7"
]

WARDS_HANOI = [
    "Phường Hoàn Kiếm, Quận Hoàn Kiếm", "Phường Hàng Bạc, Quận Hoàn Kiếm",
    "Phường Cửa Đông, Quận Hoàn Kiếm", "Phường Trần Hưng Đạo, Quận Hoàng Mai",
    "Phường Thanh Xuân, Quận Thanh Xuân", "Phường Láng Hạ, Quận Đống Đa",
    "Phường Kim Mã, Quận Ba Đình", "Phường Liễu Giai, Quận Ba Đình",
    "Phường Yên Hòa, Quận Cầu Giấy", "Phường Dịch Vọng, Quận Cầu Giấy"
]

WARDS_GENERIC = [
    "Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5",
    "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10",
    "Phường Trung Tâm", "Phường An Bình", "Phường Hòa Bình",
    "Xã An Phú", "Xã Bình Minh", "Xã Tân Thành", "Thị trấn Hóc Môn"
]

# Street names
STREETS = [
    "Nguyễn Huệ", "Lê Lợi", "Trần Hưng Đạo", "Nguyễn Trãi", "Lý Thường Kiệt",
    "Hai Bà Trưng", "Điện Biên Phủ", "Võ Văn Tần", "Nguyễn Đình Chiểu",
    "Cách Mạng Tháng 8", "Nguyễn Văn Cừ", "Lê Văn Sỹ", "Trường Chinh",
    "Hoàng Văn Thụ", "Phan Đăng Lưu", "Đinh Tiên Hoàng", "Pasteur",
    "Nam Kỳ Khởi Nghĩa", "Nguyễn Thị Minh Khai", "Võ Thị Sáu",
    "Bà Huyện Thanh Quan", "Lý Tự Trọng", "Nguyễn Bỉnh Khiêm",
    "Trần Quốc Toản", "Lê Duẩn", "Nguyễn Công Trứ", "Phạm Ngọc Thạch",
    "Tôn Đức Thắng", "Nguyễn Tất Thành", "Trần Phú", "Quang Trung"
]

# Landmarks
LANDMARKS = [
    "gần chợ Bến Thành", "đối diện siêu thị BigC", "cạnh trường THPT Lê Hồng Phong",
    "gần bệnh viện Chợ Rẫy", "đối diện công viên Tao Đàn", "cạnh nhà thờ Đức Bà",
    "gần Bưu điện Thành phố", "đối diện khách sạn Rex", "cạnh Nhà hát Thành phố",
    "gần trạm xăng Petrolimex", "đối diện ngân hàng Vietcombank", "cạnh trường Đại học Bách Khoa",
    "gần cầu Sài Gòn", "đối diện công ty may", "cạnh chung cư Sunrise",
    "gần ngã tư Hàng Xanh", "đối diện Metro", "cạnh chợ An Đông",
    "gần bến xe Miền Đông", "đối diện sân bay Tân Sơn Nhất"
]

# Phone number patterns
def generate_phone():
    prefixes = ["090", "091", "093", "094", "096", "097", "098", "032", "033", "034", "035", "036", "037", "038", "039", "070", "076", "077", "078", "079", "081", "082", "083", "084", "085", "086", "088", "089"]
    return random.choice(prefixes) + "".join([str(random.randint(0, 9)) for _ in range(7)])

# ============ SECURITY SCENARIOS ============
SECURITY_SCENARIOS = [
    # Theft/Burglary (trộm cắp)
    ("Có trộm đột nhập vào nhà tôi!", "SECURITY", "HIGH", "theft"),
    ("Tôi phát hiện kẻ trộm đang leo tường nhà!", "SECURITY", "HIGH", "theft"),
    ("Nhà tôi bị trộm, mất hết đồ đạc!", "SECURITY", "HIGH", "theft"),
    ("Có người đang bẻ khóa xe máy của tôi!", "SECURITY", "HIGH", "theft"),
    ("Trộm đang phá cửa nhà hàng xóm!", "SECURITY", "HIGH", "theft"),
    ("Tôi thấy người lạ đang lục lọi xe ô tô!", "SECURITY", "HIGH", "theft"),
    ("Có kẻ gian đang vào nhà tôi!", "SECURITY", "HIGH", "theft"),
    ("Nhà tôi vừa bị đột nhập, tên trộm còn trong nhà!", "SECURITY", "CRITICAL", "theft"),
    ("Phát hiện kẻ trộm trong khu chung cư!", "SECURITY", "HIGH", "theft"),
    ("Có người đang ăn trộm xe đạp điện!", "SECURITY", "HIGH", "theft"),
    ("Bọn trộm đang tháo gương xe ô tô!", "SECURITY", "MEDIUM", "theft"),
    ("Nhà kho của công ty bị trộm đột nhập!", "SECURITY", "HIGH", "theft"),
    ("Có người đang trộm cắp tài sản công!", "SECURITY", "HIGH", "theft"),
    ("Trộm đã lấy mất laptop và điện thoại của tôi!", "SECURITY", "MEDIUM", "theft"),
    ("Phát hiện kẻ trộm đang chui vào cửa sổ!", "SECURITY", "HIGH", "theft"),

    # Robbery (cướp giật)
    ("Tôi vừa bị cướp giật điện thoại!", "SECURITY", "HIGH", "robbery"),
    ("Có 2 tên cướp vừa giật túi xách của tôi!", "SECURITY", "HIGH", "robbery"),
    ("Cướp xe máy! Chúng vừa chạy về hướng cầu!", "SECURITY", "CRITICAL", "robbery"),
    ("Tôi bị cướp đe dọa bằng dao!", "SECURITY", "CRITICAL", "robbery"),
    ("Có vụ cướp tiệm vàng đang xảy ra!", "SECURITY", "CRITICAL", "robbery"),
    ("2 tên cướp có súng đang trong ngân hàng!", "SECURITY", "CRITICAL", "robbery"),
    ("Bọn cướp vừa giật dây chuyền của bà cụ!", "SECURITY", "HIGH", "robbery"),
    ("Tôi bị cướp lấy mất ví tiền!", "SECURITY", "MEDIUM", "robbery"),
    ("Có người bị cướp xe ô tô có vũ trang!", "SECURITY", "CRITICAL", "robbery"),
    ("Cướp giật xảy ra trước cổng trường!", "SECURITY", "HIGH", "robbery"),
    ("3 tên cướp đang cướp cửa hàng điện thoại!", "SECURITY", "CRITICAL", "robbery"),
    ("Vợ tôi vừa bị giật túi, tên cướp đi xe Wave!", "SECURITY", "HIGH", "robbery"),
    ("Cướp có súng đang khống chế nhân viên!", "SECURITY", "CRITICAL", "robbery"),
    ("Tôi bị ép xe và cướp tài sản!", "SECURITY", "HIGH", "robbery"),
    ("Có vụ cướp xe taxi đang xảy ra!", "SECURITY", "CRITICAL", "robbery"),

    # Fight/Violence (đánh nhau)
    ("Có đánh nhau ở quán nhậu!", "SECURITY", "HIGH", "fight"),
    ("2 nhóm thanh niên đang đánh nhau!", "SECURITY", "HIGH", "fight"),
    ("Có người bị đánh hội đồng!", "SECURITY", "CRITICAL", "fight"),
    ("Đang có ẩu đả trước cổng trường!", "SECURITY", "HIGH", "fight"),
    ("Có vụ hành hung nghiêm trọng!", "SECURITY", "CRITICAL", "fight"),
    ("Mấy người đang đánh nhau bằng hung khí!", "SECURITY", "CRITICAL", "fight"),
    ("Có người đang bị đánh đập dã man!", "SECURITY", "CRITICAL", "fight"),
    ("Nhóm côn đồ đang gây sự đánh người!", "SECURITY", "CRITICAL", "fight"),
    ("Có vụ xô xát tại quán karaoke!", "SECURITY", "HIGH", "fight"),
    ("2 gia đình đang ẩu đả với nhau!", "SECURITY", "HIGH", "fight"),
    ("Có người dùng dao chém nhau!", "SECURITY", "CRITICAL", "fight"),
    ("Đang có vụ đánh ghen rất dữ dội!", "SECURITY", "HIGH", "fight"),
    ("Nhóm thanh niên đuổi đánh 1 người!", "SECURITY", "CRITICAL", "fight"),
    ("Có ẩu đả tại sân bóng!", "SECURITY", "HIGH", "fight"),
    ("Tài xế taxi và khách đang đánh nhau!", "SECURITY", "MEDIUM", "fight"),

    # Domestic Violence (bạo lực gia đình)
    ("Hàng xóm đang đánh vợ rất dữ!", "SECURITY", "HIGH", "domestic"),
    ("Có tiếng la hét, người chồng đang hành hung vợ!", "SECURITY", "HIGH", "domestic"),
    ("Bố tôi đang đánh mẹ, cần công an gấp!", "SECURITY", "CRITICAL", "domestic"),
    ("Có vụ bạo lực gia đình, trẻ em đang khóc!", "SECURITY", "HIGH", "domestic"),
    ("Người đàn ông đang đe dọa giết vợ!", "SECURITY", "CRITICAL", "domestic"),
    ("Có tiếng đập phá và la hét từ nhà bên cạnh!", "SECURITY", "HIGH", "domestic"),
    ("Vợ chồng hàng xóm đánh nhau, nghe tiếng đập đầu vào tường!", "SECURITY", "CRITICAL", "domestic"),
    ("Có người phụ nữ đang bị chồng đuổi đánh ngoài đường!", "SECURITY", "HIGH", "domestic"),
    ("Con trai đang hành hung bố mẹ già!", "SECURITY", "HIGH", "domestic"),
    ("Có vụ bạo hành trẻ em trong gia đình!", "SECURITY", "CRITICAL", "domestic"),

    # Street Racing (đua xe)
    ("Có nhóm thanh niên đang đua xe trái phép!", "SECURITY", "HIGH", "racing"),
    ("Đua xe gây ồn ào khu dân cư lúc nửa đêm!", "SECURITY", "MEDIUM", "racing"),
    ("Hàng chục xe máy đang đua xe trên quốc lộ!", "SECURITY", "HIGH", "racing"),
    ("Bọn đua xe vừa gây tai nạn!", "SECURITY,MEDICAL", "CRITICAL", "racing"),
    ("Thanh niên đua xe bốc đầu trước trường học!", "SECURITY", "HIGH", "racing"),
    ("Có đoàn xe đua đang phóng rất nhanh!", "SECURITY", "HIGH", "racing"),
    ("Nhóm quái xế đang gây rối trên đường!", "SECURITY", "HIGH", "racing"),

    # Threats/Harassment (đe dọa, quấy rối)
    ("Có người đe dọa giết cả gia đình tôi!", "SECURITY", "CRITICAL", "threat"),
    ("Tôi bị theo dõi và đe dọa!", "SECURITY", "HIGH", "threat"),
    ("Có người lạ quấy rối trẻ em!", "SECURITY", "CRITICAL", "threat"),
    ("Bị đe dọa tống tiền!", "SECURITY", "HIGH", "threat"),
    ("Có người rình rập quanh nhà tôi!", "SECURITY", "MEDIUM", "threat"),
    ("Tôi bị stalker theo dõi!", "SECURITY", "HIGH", "threat"),
    ("Có người lạ đứng trước cổng trường theo dõi học sinh!", "SECURITY", "HIGH", "threat"),
    ("Người yêu cũ đe dọa tạt axit!", "SECURITY", "CRITICAL", "threat"),
    ("Có người đe dọa đốt nhà!", "SECURITY", "CRITICAL", "threat"),
    ("Bị quấy rối tình dục trên xe buýt!", "SECURITY", "HIGH", "threat"),

    # Drug-related (ma túy)
    ("Phát hiện điểm mua bán ma túy!", "SECURITY", "HIGH", "drug"),
    ("Có người đang sử dụng ma túy trong công viên!", "SECURITY", "MEDIUM", "drug"),
    ("Nghi ngờ nhà bên cạnh buôn bán ma túy!", "SECURITY", "MEDIUM", "drug"),
    ("Thấy người lạ đưa gói nhỏ cho thanh niên!", "SECURITY", "MEDIUM", "drug"),
    ("Có tiệm net cho thanh niên sử dụng ma túy!", "SECURITY", "HIGH", "drug"),

    # Kidnapping (bắt cóc)
    ("Con tôi bị bắt cóc!", "SECURITY", "CRITICAL", "kidnapping"),
    ("Có người đang lôi trẻ em lên xe!", "SECURITY", "CRITICAL", "kidnapping"),
    ("Phát hiện vụ bắt cóc trẻ em!", "SECURITY", "CRITICAL", "kidnapping"),
    ("Người phụ nữ đang bị ép lên xe van!", "SECURITY", "CRITICAL", "kidnapping"),
    ("Trẻ em kêu cứu, bị người lạ kéo đi!", "SECURITY", "CRITICAL", "kidnapping"),

    # Fraud/Scam (lừa đảo)
    ("Tôi bị lừa đảo mất tiền!", "SECURITY", "MEDIUM", "fraud"),
    ("Có người giả danh công an đến nhà!", "SECURITY", "HIGH", "fraud"),
    ("Phát hiện nhóm lừa đảo đang hoạt động!", "SECURITY", "MEDIUM", "fraud"),
    ("Bị lừa mua hàng giả!", "SECURITY", "LOW", "fraud"),
    ("Có người lừa đảo người già bán thuốc giả!", "SECURITY", "MEDIUM", "fraud"),

    # Public Disturbance (gây rối)
    ("Có người say rượu gây rối!", "SECURITY", "MEDIUM", "disturbance"),
    ("Nhóm thanh niên quậy phá quán ăn!", "SECURITY", "HIGH", "disturbance"),
    ("Có người điên đang chạy loạn trên phố!", "SECURITY", "HIGH", "disturbance"),
    ("Người say rượu đập phá tài sản!", "SECURITY", "HIGH", "disturbance"),
    ("Có vụ xô xát gây ách tắc giao thông!", "SECURITY", "MEDIUM", "disturbance"),
    ("Nhóm côn đồ đang chặn đường!", "SECURITY", "HIGH", "disturbance"),
    ("Người tâm thần cầm dao đuổi người!", "SECURITY", "CRITICAL", "disturbance"),
]

# ============ MEDICAL SCENARIOS ============
MEDICAL_SCENARIOS = [
    # Traffic Accidents (tai nạn giao thông)
    ("Có tai nạn giao thông, người bị thương nặng!", "MEDICAL", "CRITICAL", "accident"),
    ("Xe máy đâm vào ô tô, 2 người bất tỉnh!", "MEDICAL", "CRITICAL", "accident"),
    ("Tai nạn xe khách, nhiều người bị thương!", "MEDICAL", "CRITICAL", "accident"),
    ("Xe container đâm vào nhà dân, có người mắc kẹt!", "MEDICAL,FIRE_RESCUE", "CRITICAL", "accident"),
    ("Xe máy va chạm, 1 người ngã ra đường!", "MEDICAL", "HIGH", "accident"),
    ("Tai nạn liên hoàn 3 xe ô tô!", "MEDICAL", "CRITICAL", "accident"),
    ("Người đi bộ bị xe tải tông!", "MEDICAL", "CRITICAL", "accident"),
    ("Xe taxi lật ngửa, tài xế mắc kẹt!", "MEDICAL,FIRE_RESCUE", "CRITICAL", "accident"),
    ("Xe máy tông cột điện, người lái bất tỉnh!", "MEDICAL", "CRITICAL", "accident"),
    ("Tai nạn giao thông, có người chảy máu nhiều!", "MEDICAL", "CRITICAL", "accident"),
    ("Ô tô đâm vào xe máy tại ngã tư!", "MEDICAL", "HIGH", "accident"),
    ("Xe ben cán nát xe máy!", "MEDICAL", "CRITICAL", "accident"),
    ("Tai nạn xe buýt, hành khách bị thương!", "MEDICAL", "HIGH", "accident"),
    ("Xe tải đâm sập nhà, có người bên trong!", "MEDICAL,FIRE_RESCUE", "CRITICAL", "accident"),
    ("2 xe máy va chạm, cả 2 người đều bị thương!", "MEDICAL", "HIGH", "accident"),

    # Heart Attack/Stroke (đau tim, đột quỵ)
    ("Bố tôi bị đau tim, đang khó thở!", "MEDICAL", "CRITICAL", "cardiac"),
    ("Bà tôi đột quỵ, nửa người không cử động được!", "MEDICAL", "CRITICAL", "cardiac"),
    ("Có người đang bị nhồi máu cơ tim!", "MEDICAL", "CRITICAL", "cardiac"),
    ("Ông cụ đau ngực dữ dội, mặt tái nhợt!", "MEDICAL", "CRITICAL", "cardiac"),
    ("Người bệnh tim đang lên cơn!", "MEDICAL", "CRITICAL", "cardiac"),
    ("Mẹ tôi bị đột quỵ, miệng méo xệch!", "MEDICAL", "CRITICAL", "cardiac"),
    ("Có người gục xuống, nghi đau tim!", "MEDICAL", "CRITICAL", "cardiac"),
    ("Ông tôi bị tức ngực, khó thở!", "MEDICAL", "CRITICAL", "cardiac"),

    # Breathing Difficulty (khó thở)
    ("Con tôi bị suyễn lên cơn, khó thở!", "MEDICAL", "CRITICAL", "breathing"),
    ("Người bệnh hen suyễn đang thở khò khè!", "MEDICAL", "CRITICAL", "breathing"),
    ("Bé bị hóc xương, không thở được!", "MEDICAL", "CRITICAL", "breathing"),
    ("Có người bị dị ứng, sưng cổ họng!", "MEDICAL", "CRITICAL", "breathing"),
    ("Em bé bị nghẹn thức ăn!", "MEDICAL", "CRITICAL", "breathing"),
    ("Người già khó thở, môi tím tái!", "MEDICAL", "CRITICAL", "breathing"),
    ("Bệnh nhân COPD lên cơn nặng!", "MEDICAL", "CRITICAL", "breathing"),
    ("Trẻ bị hóc đồ chơi, tím mặt!", "MEDICAL", "CRITICAL", "breathing"),

    # Unconscious/Fainting (bất tỉnh, ngất)
    ("Có người bất tỉnh trên đường!", "MEDICAL", "CRITICAL", "unconscious"),
    ("Đồng nghiệp ngất xỉu trong văn phòng!", "MEDICAL", "HIGH", "unconscious"),
    ("Bà cụ ngã gục giữa chợ!", "MEDICAL", "HIGH", "unconscious"),
    ("Có người nằm bất động trên vỉa hè!", "MEDICAL", "CRITICAL", "unconscious"),
    ("Sinh viên ngất trong lớp học!", "MEDICAL", "HIGH", "unconscious"),
    ("Người đi bộ đột nhiên gục xuống!", "MEDICAL", "CRITICAL", "unconscious"),
    ("Công nhân ngất vì nắng nóng!", "MEDICAL", "HIGH", "unconscious"),
    ("Có người bất tỉnh trong thang máy!", "MEDICAL", "CRITICAL", "unconscious"),

    # Seizures (co giật)
    ("Con tôi bị co giật, sùi bọt mép!", "MEDICAL", "CRITICAL", "seizure"),
    ("Có người bị động kinh!", "MEDICAL", "CRITICAL", "seizure"),
    ("Bệnh nhân đang co giật dữ dội!", "MEDICAL", "CRITICAL", "seizure"),
    ("Trẻ em bị sốt cao co giật!", "MEDICAL", "CRITICAL", "seizure"),
    ("Người già bị co giật toàn thân!", "MEDICAL", "CRITICAL", "seizure"),

    # Bleeding/Injury (chảy máu, chấn thương)
    ("Có người bị đứt tay chảy máu nhiều!", "MEDICAL", "HIGH", "bleeding"),
    ("Tai nạn lao động, công nhân mất máu!", "MEDICAL", "CRITICAL", "bleeding"),
    ("Có người bị dao đâm chảy máu!", "MEDICAL,SECURITY", "CRITICAL", "bleeding"),
    ("Người bị thương chảy máu không cầm được!", "MEDICAL", "CRITICAL", "bleeding"),
    ("Có vết thương hở rất lớn!", "MEDICAL", "CRITICAL", "bleeding"),
    ("Công nhân bị máy cắt đứt ngón tay!", "MEDICAL", "CRITICAL", "bleeding"),
    ("Có người bị gãy xương hở!", "MEDICAL", "CRITICAL", "bleeding"),
    ("Tai nạn, có người chảy máu đầu!", "MEDICAL", "CRITICAL", "bleeding"),

    # Poisoning (ngộ độc)
    ("Gia đình tôi bị ngộ độc thực phẩm!", "MEDICAL", "HIGH", "poisoning"),
    ("Con tôi uống nhầm thuốc tẩy!", "MEDICAL", "CRITICAL", "poisoning"),
    ("Nhiều người bị ngộ độc sau khi ăn tiệc!", "MEDICAL", "HIGH", "poisoning"),
    ("Bé nuốt nhầm thuốc diệt côn trùng!", "MEDICAL", "CRITICAL", "poisoning"),
    ("Công nhân hít phải hóa chất độc!", "MEDICAL", "CRITICAL", "poisoning"),
    ("Có người bị rắn cắn!", "MEDICAL", "CRITICAL", "poisoning"),
    ("Nhiều học sinh bị ngộ độc trong căn tin!", "MEDICAL", "HIGH", "poisoning"),
    ("Người già uống nhầm thuốc!", "MEDICAL", "HIGH", "poisoning"),

    # Burns (bỏng)
    ("Con tôi bị bỏng nước sôi!", "MEDICAL", "HIGH", "burn"),
    ("Có người bị bỏng điện!", "MEDICAL", "CRITICAL", "burn"),
    ("Công nhân bị bỏng hóa chất!", "MEDICAL", "CRITICAL", "burn"),
    ("Bé bị bỏng lửa nấu ăn!", "MEDICAL", "HIGH", "burn"),
    ("Người bị bỏng gas toàn thân!", "MEDICAL,FIRE_RESCUE", "CRITICAL", "burn"),
    ("Có người bị bỏng axit!", "MEDICAL", "CRITICAL", "burn"),

    # Falls (ngã)
    ("Ông tôi ngã cầu thang, không đứng dậy được!", "MEDICAL", "HIGH", "fall"),
    ("Công nhân ngã giàn giáo!", "MEDICAL", "CRITICAL", "fall"),
    ("Có người ngã từ tầng 2!", "MEDICAL", "CRITICAL", "fall"),
    ("Bà cụ ngã trong nhà tắm!", "MEDICAL", "HIGH", "fall"),
    ("Thợ xây ngã từ trên cao!", "MEDICAL", "CRITICAL", "fall"),
    ("Trẻ em ngã từ ban công!", "MEDICAL", "CRITICAL", "fall"),
    ("Người già ngã đập đầu, có máu!", "MEDICAL", "CRITICAL", "fall"),

    # Childbirth (sinh con)
    ("Vợ tôi đang chuyển dạ!", "MEDICAL", "CRITICAL", "childbirth"),
    ("Có người sắp sinh trên xe!", "MEDICAL", "CRITICAL", "childbirth"),
    ("Phụ nữ mang thai đau bụng dữ dội!", "MEDICAL", "CRITICAL", "childbirth"),
    ("Vợ tôi chảy ối rồi, em bé sắp ra!", "MEDICAL", "CRITICAL", "childbirth"),
    ("Có bà bầu đang sinh rơi ngoài đường!", "MEDICAL", "CRITICAL", "childbirth"),

    # Allergic Reactions (dị ứng, sốc phản vệ)
    ("Con tôi bị sốc phản vệ sau tiêm thuốc!", "MEDICAL", "CRITICAL", "allergy"),
    ("Có người dị ứng sưng mặt, khó thở!", "MEDICAL", "CRITICAL", "allergy"),
    ("Bệnh nhân bị phản ứng thuốc!", "MEDICAL", "CRITICAL", "allergy"),
    ("Trẻ bị dị ứng thức ăn, nổi mề đay!", "MEDICAL", "HIGH", "allergy"),
    ("Sốc phản vệ sau khi ăn hải sản!", "MEDICAL", "CRITICAL", "allergy"),
]

# ============ FIRE/RESCUE SCENARIOS ============
FIRE_RESCUE_SCENARIOS = [
    # House Fire (cháy nhà)
    ("Cháy nhà! Lửa đang bốc lên!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Nhà tôi đang cháy!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Cháy lớn ở khu dân cư!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Lửa cháy lan sang nhà bên cạnh!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Cháy chung cư, khói đen mù mịt!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Tầng hầm chung cư đang cháy!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Cháy nhà kho, lửa lan nhanh!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Nhà hàng xóm bốc cháy!", "FIRE_RESCUE", "HIGH", "house_fire"),
    ("Cháy phòng trọ, có người bên trong!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "house_fire"),
    ("Lửa bùng lên từ bếp, lan ra cả nhà!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Cháy căn hộ tầng 15!", "FIRE_RESCUE", "CRITICAL", "house_fire"),
    ("Nhà 3 tầng đang cháy dữ dội!", "FIRE_RESCUE", "CRITICAL", "house_fire"),

    # Vehicle Fire (cháy xe)
    ("Xe ô tô đang bốc cháy!", "FIRE_RESCUE", "CRITICAL", "vehicle_fire"),
    ("Xe máy cháy giữa đường!", "FIRE_RESCUE", "HIGH", "vehicle_fire"),
    ("Xe tải chở xăng bốc cháy!", "FIRE_RESCUE", "CRITICAL", "vehicle_fire"),
    ("Xe buýt cháy, hành khách đang chạy ra!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "vehicle_fire"),
    ("Xe container cháy trên cao tốc!", "FIRE_RESCUE", "CRITICAL", "vehicle_fire"),
    ("Xe máy điện cháy trong nhà!", "FIRE_RESCUE", "CRITICAL", "vehicle_fire"),

    # Industrial/Factory Fire (cháy xưởng, công ty)
    ("Cháy xưởng gỗ!", "FIRE_RESCUE", "CRITICAL", "industrial_fire"),
    ("Nhà máy đang bốc cháy!", "FIRE_RESCUE", "CRITICAL", "industrial_fire"),
    ("Cháy kho hàng lớn!", "FIRE_RESCUE", "CRITICAL", "industrial_fire"),
    ("Xưởng may cháy, công nhân đang thoát ra!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "industrial_fire"),
    ("Cháy nhà xưởng hóa chất!", "FIRE_RESCUE", "CRITICAL", "industrial_fire"),
    ("Cháy chợ, nhiều ki ốt bị ảnh hưởng!", "FIRE_RESCUE", "CRITICAL", "industrial_fire"),
    ("Siêu thị đang cháy!", "FIRE_RESCUE", "CRITICAL", "industrial_fire"),

    # Gas Explosion/Leak (nổ gas, rò rỉ gas)
    ("Nổ bình gas trong bếp!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "gas"),
    ("Rò rỉ gas, mùi rất nặng!", "FIRE_RESCUE", "HIGH", "gas"),
    ("Nổ gas nhà hàng!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "gas"),
    ("Có mùi gas trong tòa nhà!", "FIRE_RESCUE", "HIGH", "gas"),
    ("Bình gas bốc cháy!", "FIRE_RESCUE", "CRITICAL", "gas"),
    ("Nổ lớn do gas, nhà sập một phần!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "gas"),
    ("Rò rỉ đường ống gas trên phố!", "FIRE_RESCUE", "HIGH", "gas"),

    # Trapped/Stuck (mắc kẹt)
    ("Có người mắc kẹt trong thang máy!", "FIRE_RESCUE", "HIGH", "trapped"),
    ("Trẻ em bị kẹt trong xe ô tô!", "FIRE_RESCUE", "CRITICAL", "trapped"),
    ("Công nhân mắc kẹt trong đống đổ nát!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "trapped"),
    ("Người bị mắc kẹt sau tai nạn!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "trapped"),
    ("Có người bị kẹt trong cửa cuốn!", "FIRE_RESCUE", "HIGH", "trapped"),
    ("Thang máy hỏng, có 5 người bên trong!", "FIRE_RESCUE", "HIGH", "trapped"),
    ("Trẻ em chui vào ống cống bị kẹt!", "FIRE_RESCUE", "CRITICAL", "trapped"),
    ("Người bị kẹt dưới xe tải!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "trapped"),

    # Building Collapse (sập nhà, đổ công trình)
    ("Nhà đang sập!", "FIRE_RESCUE", "CRITICAL", "collapse"),
    ("Công trình xây dựng đổ sập!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "collapse"),
    ("Giàn giáo sập, có công nhân mắc kẹt!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "collapse"),
    ("Tường nhà đổ đè người!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "collapse"),
    ("Mái nhà sập do mưa lớn!", "FIRE_RESCUE", "HIGH", "collapse"),
    ("Trần nhà sập trong lớp học!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "collapse"),

    # Drowning (đuối nước)
    ("Có người đuối nước ở sông!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "drowning"),
    ("Trẻ em chìm dưới hồ bơi!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "drowning"),
    ("Có người rơi xuống kênh!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "drowning"),
    ("Người nhảy sông tự tử!", "FIRE_RESCUE,MEDICAL,SECURITY", "CRITICAL", "drowning"),
    ("Thuyền lật, có người đang chìm!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "drowning"),
    ("Trẻ em đuối nước ở ao!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "drowning"),
    ("Có người bị cuốn trôi theo dòng nước!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "drowning"),
    ("Người nhảy cầu!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "drowning"),

    # Flood/Natural Disaster (ngập, lũ, thiên tai)
    ("Nhà bị ngập nước, cần cứu hộ!", "FIRE_RESCUE", "HIGH", "flood"),
    ("Lũ quét, có người mắc kẹt trên mái nhà!", "FIRE_RESCUE", "CRITICAL", "flood"),
    ("Nước lũ dâng cao, cần di dời!", "FIRE_RESCUE", "HIGH", "flood"),
    ("Gia đình tôi bị cô lập vì lũ!", "FIRE_RESCUE", "HIGH", "flood"),
    ("Sạt lở đất, nhà sập!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "flood"),
    ("Đường ngập sâu, ô tô chết máy!", "FIRE_RESCUE", "MEDIUM", "flood"),
    ("Nước tràn vào nhà, không thoát được!", "FIRE_RESCUE", "HIGH", "flood"),

    # Forest Fire (cháy rừng)
    ("Cháy rừng, lửa lan nhanh!", "FIRE_RESCUE", "CRITICAL", "forest_fire"),
    ("Đám cháy rừng đang tiến về khu dân cư!", "FIRE_RESCUE", "CRITICAL", "forest_fire"),
    ("Cháy rừng phòng hộ!", "FIRE_RESCUE", "CRITICAL", "forest_fire"),
    ("Có vụ cháy lớn trên núi!", "FIRE_RESCUE", "HIGH", "forest_fire"),

    # Electrical Hazard (điện giật)
    ("Có người bị điện giật!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "electrical"),
    ("Dây điện đứt rơi xuống đường!", "FIRE_RESCUE", "HIGH", "electrical"),
    ("Trẻ em chạm vào ổ điện bị giật!", "MEDICAL,FIRE_RESCUE", "CRITICAL", "electrical"),
    ("Cột điện đổ, có người bị thương!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "electrical"),
    ("Chập điện gây cháy!", "FIRE_RESCUE", "CRITICAL", "electrical"),
]

# ============ COMBINED SCENARIOS ============
COMBINED_SCENARIOS = [
    ("Cháy nhà có người bị bỏng nặng!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "fire_injury"),
    ("Tai nạn giao thông, xe bốc cháy, có người mắc kẹt!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "accident_fire"),
    ("Cướp có vũ trang, nạn nhân bị thương!", "SECURITY,MEDICAL", "CRITICAL", "robbery_injury"),
    ("Đánh nhau, có người bị đâm chảy máu!", "SECURITY,MEDICAL", "CRITICAL", "fight_injury"),
    ("Cháy do đốt phá có chủ đích!", "FIRE_RESCUE,SECURITY", "CRITICAL", "arson"),
    ("Người nhảy cầu tự tử!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "suicide"),
    ("Trộm đột nhập đánh chủ nhà bị thương!", "SECURITY,MEDICAL", "CRITICAL", "theft_injury"),
    ("Đua xe gây tai nạn chết người!", "SECURITY,MEDICAL", "CRITICAL", "racing_accident"),
    ("Nổ gas, nhiều người bị thương, nghi bị phá hoại!", "FIRE_RESCUE,MEDICAL,SECURITY", "CRITICAL", "explosion"),
    ("Sập công trình, có người mắc kẹt bị thương!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "collapse_injury"),
    ("Bạo lực gia đình, vợ bị đánh bất tỉnh!", "SECURITY,MEDICAL", "CRITICAL", "domestic_injury"),
    ("Xe cháy sau va chạm, tài xế mắc kẹt!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "accident_fire"),
    ("Cháy nhà, có người nhảy từ tầng cao!", "FIRE_RESCUE,MEDICAL", "CRITICAL", "fire_fall"),
    ("Cướp giật gây tai nạn cho nạn nhân!", "SECURITY,MEDICAL", "CRITICAL", "robbery_accident"),
    ("Thanh niên say rượu đập phá và đánh người!", "SECURITY,MEDICAL", "HIGH", "drunk_violence"),
]

# ============ EDGE CASES ============
EDGE_CASES = [
    # Non-emergency
    ("Tôi muốn hỏi số điện thoại bệnh viện", "", "LOW", "non_emergency"),
    ("Mèo của tôi bị lạc", "", "LOW", "non_emergency"),
    ("Tôi bị mất chìa khóa nhà", "", "LOW", "non_emergency"),
    ("Hỏi đường đến bệnh viện", "", "LOW", "non_emergency"),
    ("Tôi muốn khiếu nại về tiếng ồn", "", "LOW", "non_emergency"),
    ("Máy ATM nuốt thẻ", "", "LOW", "non_emergency"),
    ("Wifi nhà tôi không hoạt động", "", "LOW", "non_emergency"),

    # Unclear/Vague
    ("Cứu tôi với!", "UNKNOWN", "HIGH", "unclear"),
    ("Có chuyện xảy ra!", "UNKNOWN", "MEDIUM", "unclear"),
    ("Tôi cần giúp đỡ!", "UNKNOWN", "MEDIUM", "unclear"),
    ("Đến đây ngay!", "UNKNOWN", "HIGH", "unclear"),
    ("Có vấn đề lớn rồi!", "UNKNOWN", "MEDIUM", "unclear"),
    ("Tình hình nguy hiểm!", "UNKNOWN", "HIGH", "unclear"),

    # Prank/False alarm
    ("Haha, tôi chỉ đùa thôi", "", "LOW", "prank"),
    ("Không có gì đâu, tôi nhầm", "", "LOW", "prank"),
    ("Xin lỗi, tôi gọi nhầm", "", "LOW", "prank"),

    # Multiple issues mentioned
    ("Nhà tôi cháy và có trộm, vợ tôi bị thương!", "FIRE_RESCUE,SECURITY,MEDICAL", "CRITICAL", "multiple"),
    ("Tai nạn xe, có người đánh nhau và lửa bốc cháy!", "MEDICAL,SECURITY,FIRE_RESCUE", "CRITICAL", "multiple"),

    # Emotional/Panic
    ("Trời ơi, cứu với, cháy cháy cháy!", "FIRE_RESCUE", "CRITICAL", "panic"),
    ("Ối ối ối, có người chết rồi!", "MEDICAL", "CRITICAL", "panic"),
    ("Đừng để tôi chết, cứu tôi!", "UNKNOWN", "CRITICAL", "panic"),

    # Incomplete address
    ("Có cháy ở đường Nguyễn Huệ!", "FIRE_RESCUE", "CRITICAL", "incomplete_address"),
    ("Tai nạn gần chợ Bến Thành!", "MEDICAL", "CRITICAL", "incomplete_address"),
    ("Có đánh nhau ở quận 1!", "SECURITY", "HIGH", "incomplete_address"),
]

# ============ CONVERSATION VARIATIONS ============
# Different ways to report the same information
PHONE_VARIATIONS = [
    "Số của tôi là {}",
    "Điện thoại: {}",
    "SĐT {}",
    "Gọi cho tôi số {}",
    "{}",
    "Số điện thoại {} nha",
    "Liên hệ {}",
    "Số điện thoại của tôi là {}",
]

PEOPLE_COUNT_VARIATIONS = [
    "{} người",
    "Có {} người bị ảnh hưởng",
    "Khoảng {} người",
    "Tầm {} người",
    "{} nạn nhân",
    "Có {} người cần cứu",
    "Tổng cộng {} người",
    "Chừng {} người",
]

ADDRESS_VARIATIONS = [
    "Số {} đường {}, {}, {}",
    "{} {}, {}, {}",
    "Địa chỉ {} {}, {}, {}",
    "Tại {} đường {}, {}, {}",
    "Ở {} {}, {}, {}",
    "{} đường {}, {} {}",
]

def generate_address():
    """Generate a random Vietnamese address"""
    house_number = random.randint(1, 500)
    street = random.choice(STREETS)

    city = random.choice(CITIES)
    if "HCM" in city or "Hồ Chí Minh" in city:
        ward = random.choice(WARDS_HCMC)
    elif "Hà Nội" in city:
        ward = random.choice(WARDS_HANOI)
    else:
        ward = random.choice(WARDS_GENERIC)

    # Sometimes add landmark
    landmark = random.choice(LANDMARKS) if random.random() < 0.3 else ""

    template = random.choice(ADDRESS_VARIATIONS)
    address = template.format(house_number, street, ward, city)

    if landmark:
        address += f", {landmark}"

    return address

def generate_scenario_with_info(base_scenario: Tuple[str, str, str, str]) -> dict:
    """Generate a complete test scenario with all information"""
    message, emergency_type, priority, category = base_scenario

    # Generate supporting information
    address = generate_address()
    phone = generate_phone()
    people_count = random.randint(1, 10)
    injured_count = random.randint(0, people_count)

    return {
        "id": None,  # Will be set later
        "message": message,
        "expected_emergency_type": emergency_type,
        "expected_priority": priority,
        "category": category,
        "full_address": address,
        "phone": phone,
        "affected_people": people_count,
        "injured_people": injured_count,
    }

def generate_conversation_scenario(base_scenario: dict) -> dict:
    """Generate a multi-turn conversation scenario"""
    scenario = base_scenario.copy()

    # Generate conversation context
    phone_response = random.choice(PHONE_VARIATIONS).format(scenario["phone"])
    people_response = random.choice(PEOPLE_COUNT_VARIATIONS).format(scenario["affected_people"])

    scenario["phone_response"] = phone_response
    scenario["people_response"] = people_response

    return scenario

def generate_stress_test_message(base_message: str) -> str:
    """Generate variations for stress testing"""
    variations = [
        base_message.upper(),  # All caps
        base_message.lower(),  # All lowercase
        base_message + "!!!!!",  # Extra punctuation
        base_message.replace(" ", "  "),  # Extra spaces
        "Alo alo, " + base_message,  # Common prefix
        base_message + " Nhanh lên!",  # Urgency
        "Xin lỗi, " + base_message,  # Polite prefix
        base_message + " Làm ơn giúp tôi!",  # Plea
    ]
    return random.choice(variations)

def generate_all_scenarios():
    """Generate all 5000 test scenarios"""
    scenarios = []
    scenario_id = 1

    # 1. Security scenarios with variations (800 scenarios)
    print("Generating SECURITY scenarios...")
    for base in SECURITY_SCENARIOS:
        for _ in range(8):  # 8 variations each
            scenario = generate_scenario_with_info(base)
            scenario["id"] = scenario_id
            scenarios.append(generate_conversation_scenario(scenario))
            scenario_id += 1

            # Add stress test variation
            if scenario_id <= 5000 and random.random() < 0.3:
                stress_scenario = scenario.copy()
                stress_scenario["id"] = scenario_id
                stress_scenario["message"] = generate_stress_test_message(base[0])
                scenarios.append(stress_scenario)
                scenario_id += 1

    # 2. Medical scenarios with variations (1000 scenarios)
    print("Generating MEDICAL scenarios...")
    for base in MEDICAL_SCENARIOS:
        for _ in range(10):  # 10 variations each
            scenario = generate_scenario_with_info(base)
            scenario["id"] = scenario_id
            scenarios.append(generate_conversation_scenario(scenario))
            scenario_id += 1

            if scenario_id <= 5000 and random.random() < 0.3:
                stress_scenario = scenario.copy()
                stress_scenario["id"] = scenario_id
                stress_scenario["message"] = generate_stress_test_message(base[0])
                scenarios.append(stress_scenario)
                scenario_id += 1

    # 3. Fire/Rescue scenarios with variations (1000 scenarios)
    print("Generating FIRE_RESCUE scenarios...")
    for base in FIRE_RESCUE_SCENARIOS:
        for _ in range(12):  # 12 variations each
            scenario = generate_scenario_with_info(base)
            scenario["id"] = scenario_id
            scenarios.append(generate_conversation_scenario(scenario))
            scenario_id += 1

            if scenario_id <= 5000 and random.random() < 0.3:
                stress_scenario = scenario.copy()
                stress_scenario["id"] = scenario_id
                stress_scenario["message"] = generate_stress_test_message(base[0])
                scenarios.append(stress_scenario)
                scenario_id += 1

    # 4. Combined scenarios (500 scenarios)
    print("Generating COMBINED scenarios...")
    for base in COMBINED_SCENARIOS:
        for _ in range(30):
            scenario = generate_scenario_with_info(base)
            scenario["id"] = scenario_id
            scenarios.append(generate_conversation_scenario(scenario))
            scenario_id += 1

    # 5. Edge cases (200 scenarios)
    print("Generating EDGE CASE scenarios...")
    for base in EDGE_CASES:
        for _ in range(8):
            scenario = generate_scenario_with_info(base)
            scenario["id"] = scenario_id
            scenarios.append(generate_conversation_scenario(scenario))
            scenario_id += 1

    # 6. Fill remaining with random mixed scenarios
    print("Generating additional scenarios to reach 5000...")
    all_bases = SECURITY_SCENARIOS + MEDICAL_SCENARIOS + FIRE_RESCUE_SCENARIOS + COMBINED_SCENARIOS
    while len(scenarios) < 5000:
        base = random.choice(all_bases)
        scenario = generate_scenario_with_info(base)
        scenario["id"] = len(scenarios) + 1
        scenarios.append(generate_conversation_scenario(scenario))

    # Ensure exactly 5000 scenarios
    scenarios = scenarios[:5000]

    # Re-number scenarios
    for i, scenario in enumerate(scenarios):
        scenario["id"] = i + 1

    return scenarios

def save_to_csv(scenarios: List[dict], filename: str):
    """Save scenarios to CSV file"""
    fieldnames = [
        "id", "message", "expected_emergency_type", "expected_priority",
        "category", "full_address", "phone", "affected_people",
        "injured_people", "phone_response", "people_response"
    ]

    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for scenario in scenarios:
            writer.writerow(scenario)

    print(f"Saved {len(scenarios)} scenarios to {filename}")

def print_statistics(scenarios: List[dict]):
    """Print statistics about generated scenarios"""
    print("\n" + "="*50)
    print("TEST DATA STATISTICS")
    print("="*50)

    print(f"\nTotal scenarios: {len(scenarios)}")

    # Count by category
    categories = {}
    for s in scenarios:
        cat = s["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print("\nBy category:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1])[:20]:
        print(f"  {cat}: {count}")

    # Count by emergency type
    types = {}
    for s in scenarios:
        t = s["expected_emergency_type"]
        types[t] = types.get(t, 0) + 1

    print("\nBy emergency type:")
    for t, count in sorted(types.items(), key=lambda x: -x[1]):
        print(f"  {t}: {count}")

    # Count by priority
    priorities = {}
    for s in scenarios:
        p = s["expected_priority"]
        priorities[p] = priorities.get(p, 0) + 1

    print("\nBy priority:")
    for p, count in sorted(priorities.items()):
        print(f"  {p}: {count}")

if __name__ == "__main__":
    print("Generating 5000 test scenarios for 112 Emergency Chatbot...")
    print("-" * 50)

    scenarios = generate_all_scenarios()

    # Save to CSV
    save_to_csv(scenarios, "test_data_5000.csv")

    # Print statistics
    print_statistics(scenarios)

    print("\n" + "="*50)
    print("DONE! Test data saved to test_data_5000.csv")
    print("="*50)
