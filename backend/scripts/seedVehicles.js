require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

/**
 * Seed script for vehicles
 * Creates sample vehicles for testing the emergency system
 */

// Ho Chi Minh City wards (theo đơn vị hành chính mới - chỉ có phường/xã)
const hcmcWards = [
  // Khu vực 1 (trung tâm)
  'Phường Bến Nghé', 'Phường Bến Thành', 'Phường Nguyễn Thái Bình', 'Phường Phạm Ngũ Lão', 
  'Phường Cầu Ông Lãnh', 'Phường Tân Định', 'Phường Đa Kao', 'Phường Nguyễn Cư Trinh', 
  'Phường Cô Giang', 'Phường Cầu Kho', 'Phường Võ Thị Sáu', 'Phường Nguyễn Thái Bình',
  
  // Khu vực 3
  'Phường Võ Thị Sáu', 'Phường Phạm Ngũ Lão', 'Phường Cầu Ông Lãnh', 'Phường Cầu Kho',
  'Phường Tân Định', 'Phường Đa Kao', 'Phường Bến Nghé', 'Phường Bến Thành',
  
  // Khu vực 4
  'Phường An Khánh', 'Phường Bình An', 'Phường Bình Trưng Đông', 'Phường Bình Trưng Tây',
  'Phường Cát Lái', 'Phường Thảo Điền', 'Phường Thạnh Mỹ Lợi', 'Phường Thủ Thiêm',
  
  // Khu vực 5
  'Phường An Lạc', 'Phường An Lạc A', 'Phường Bình Hưng Hòa', 'Phường Bình Hưng Hòa A',
  'Phường Bình Hưng Hòa B', 'Phường Bình Trị Đông', 'Phường Bình Trị Đông A', 'Phường Bình Trị Đông B',
  
  // Khu vực 7
  'Phường Tân Thuận Đông', 'Phường Tân Thuận Tây', 'Phường Tân Kiểng', 'Phường Tân Hưng',
  'Phường Bình Thuận', 'Phường Tân Quy', 'Phường Phú Thuận', 'Phường Tân Phú', 
  'Phường Tân Phong', 'Phường Phú Mỹ',
  
  // Khu vực 10
  'Phường Linh Xuân', 'Phường Bình Chiểu', 'Phường Linh Trung', 'Phường Tam Bình',
  'Phường Tam Phú', 'Phường Hiệp Bình Phước', 'Phường Hiệp Bình Chánh', 'Phường Linh Chiểu',
  
  // Bình Thạnh
  'Phường An Phú', 'Phường An Khánh', 'Phường Bình An', 'Phường Bình Khánh',
  'Phường Bình Trưng Đông', 'Phường Bình Trưng Tây', 'Phường Cát Lái', 'Phường Thảo Điền',
  
  // Tân Bình
  'Phường Hiệp Tân', 'Phường Tân Sơn Nhì', 'Phường Tây Thạnh', 'Phường Sơn Kỳ',
  'Phường Tân Quý', 'Phường Tân Thành', 'Phường Phú Thọ Hòa', 'Phường Phú Thạnh',
  'Phường Phú Trung', 'Phường Hòa Thạnh', 'Phường Hiệp Thành', 'Phường Thới An',
  
  // Phú Nhuận
  'Phường Linh Đông', 'Phường Bình Thọ', 'Phường Linh Xuân', 'Phường Bình Chiểu',
  'Phường Linh Trung', 'Phường Tam Bình', 'Phường Tam Phú', 'Phường Hiệp Bình Phước',
  
  // Gò Vấp
  'Phường An Lạc', 'Phường An Phú Đông', 'Phường Bình Hưng Hòa', 'Phường Bình Trị Đông',
  'Phường Tân Tạo', 'Phường Tân Tạo A', 'Phường Trung Mỹ Tây', 'Phường Đông Hưng Thuận',
  
  // Thêm các phường khác
  'Phường Long Bình', 'Phường Long Thạnh Mỹ', 'Phường Tân Phú', 'Phường Hiệp Phú',
  'Phường Tăng Nhơn Phú A', 'Phường Tăng Nhơn Phú B', 'Phường Phước Long A', 'Phường Phước Long B',
  'Phường Trường Thọ', 'Phường Long Phước', 'Phường Long Trường', 'Phường Phước Bình',
  'Phường Phú Hữu', 'Phường Tân Chánh Hiệp', 'Phường Tân Hưng Thuận', 'Phường Tân Thới Hiệp',
  'Phường Thạnh Lộc', 'Phường Thạnh Xuân', 'Phường Thới An', 'Phường Trung Mỹ Tây'
];

// Stations for each vehicle type (không cần district nữa)
const ambulanceStations = [
  { name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh, TP.HCM' },
  { name: 'Bệnh viện Nguyễn Tri Phương', address: '468 Nguyễn Trãi, TP.HCM' },
  { name: 'Bệnh viện Thống Nhất', address: '1 Lý Thường Kiệt, TP.HCM' },
  { name: 'Bệnh viện Nhi Đồng 1', address: '341 Sư Vạn Hạnh, TP.HCM' },
  { name: 'Bệnh viện 115', address: '527 Sư Vạn Hạnh, TP.HCM' },
  { name: 'Bệnh viện Nhân Dân 115', address: '1 Cống Quỳnh, TP.HCM' },
  { name: 'Bệnh viện Phạm Ngọc Thạch', address: '120 Hồng Bàng, TP.HCM' },
  { name: 'Bệnh viện Từ Dụ', address: '286 Cách Mạng Tháng 8, TP.HCM' }
];

const policeStations = [
  { name: 'Trụ sở Công an TP - Khu vực 1', address: '195 Trần Hưng Đạo, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 2', address: '76 Võ Văn Tần, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 3', address: '15 Khánh Hội, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 4', address: '456 Trần Hưng Đạo, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 5', address: '678 Nguyễn Thị Thập, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 6', address: '89 3 Tháng 2, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 7', address: '12 Nguyễn Hữu Cảnh, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 8', address: '234 Cộng Hòa, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 9', address: '45 Phan Đăng Lưu, TP.HCM' },
  { name: 'Trụ sở Công an TP - Khu vực 10', address: '123 Quang Trung, TP.HCM' }
];

const fireStations = [
  { name: 'Trạm PCCC Khu vực 1', address: '101 Điện Biên Phủ, TP.HCM' },
  { name: 'Trạm PCCC Khu vực 2', address: '88 Lê Văn Sỹ, TP.HCM' },
  { name: 'Trạm PCCC Khu vực 3', address: '321 Nguyễn Trãi, TP.HCM' },
  { name: 'Trạm PCCC Khu vực 4', address: '456 Huỳnh Tấn Phát, TP.HCM' },
  { name: 'Trạm PCCC Khu vực 5', address: '567 Xô Viết Nghệ Tĩnh, TP.HCM' },
  { name: 'Trạm PCCC Khu vực 6', address: '789 Trường Chinh, TP.HCM' },
  { name: 'Trạm PCCC Khu vực 7', address: '234 Nguyễn Văn Lượng, TP.HCM' }
];

/**
 * Generate coverage areas (chỉ phường, không cần quận)
 */
function generateCoverage() {
  const coverage = [];
  const city = 'Thành phố Hồ Chí Minh';
  
  // Each vehicle covers 5-8 random wards
  const wardCount = Math.floor(Math.random() * 4) + 5; // 5-8 wards
  const shuffled = [...hcmcWards].sort(() => 0.5 - Math.random());
  const selectedWards = shuffled.slice(0, wardCount);
  
  selectedWards.forEach(ward => {
    coverage.push({
      ward: ward,
      city: city
    });
  });
  
  return coverage;
}

/**
 * Generate realistic mission history
 */
function generateMissionHistory(count = 0) {
  const history = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30) + 1; // 1-30 days ago
    const startTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const duration = Math.floor(Math.random() * 120) + 30; // 30-150 minutes
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    history.push({
      ticketId: `TD-${startTime.toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      location: `Địa chỉ khẩn cấp ${i + 1}`
    });
  }
  
  return history.sort((a, b) => b.startTime - a.startTime);
}

/**
 * Assign realistic status to vehicles
 */
function assignVehicleStatus(index, total) {
  const rand = Math.random();
  
  // 75% AVAILABLE, 15% ON_MISSION, 10% MAINTENANCE
  if (rand < 0.75) {
    return { status: 'AVAILABLE', currentMission: null };
  } else if (rand < 0.90) {
    return {
      status: 'ON_MISSION',
      currentMission: {
        ticketId: `TD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        startTime: new Date(Date.now() - Math.random() * 60 * 60 * 1000), // Started within last hour
        location: `Địa chỉ nhiệm vụ ${index}`
      }
    };
  } else {
    return { status: 'MAINTENANCE', currentMission: null };
  }
}

/**
 * Generate vehicles for a specific type
 */
function generateVehicles(type, stations, countPerStation) {
  const vehicles = [];
  const typePrefix = {
    'AMBULANCE': 'CC',
    'POLICE': 'CN',
    'FIRE_TRUCK': 'CH'
  };
  
  const equipmentByType = {
    'AMBULANCE': [
      ['Máy thở', 'Máy đo nhịp tim', 'Bộ cấp cứu', 'Máy ECG'],
      ['Máy sốc điện', 'Bộ truyền dịch', 'Máy đo huyết áp', 'Bộ oxy di động'],
      ['Máy thở di động', 'Bộ sơ cứu', 'Máy ECG', 'Bộ dụng cụ phẫu thuật nhỏ'],
      ['Bộ cấp cứu nâng cao', 'Máy đo đường huyết', 'Băng cáng', 'Máy đo SpO2'],
      ['Máy hút dịch', 'Bộ cố định cột sống', 'Máy truyền dịch tự động', 'Bộ cấp cứu tim mạch'],
      ['Máy thở áp lực dương', 'Bộ sơ cứu đa năng', 'Máy đo nhịp tim Holter', 'Bộ thuốc cấp cứu']
    ],
    'POLICE': [
      ['Thiết bị liên lạc', 'Camera hành trình', 'Còi báo động'],
      ['Dụng cụ phá cửa khẩn cấp', 'Đèn cảnh báo', 'Thiết bị ghi âm'],
      ['Thiết bị định vị GPS', 'Camera 360', 'Radio đa kênh'],
      ['Radio liên lạc', 'Thiết bị an ninh', 'Máy đo nồng độ cồn'],
      ['Thiết bị phá khóa', 'Camera mini', 'Bộ cứu hộ khẩn cấp'],
      ['Máy bộ đàm tầm xa', 'Đèn chiếu sáng công suất cao', 'Bộ dụng cụ kỹ thuật']
    ],
    'FIRE_TRUCK': [
      ['Vòi phun áp lực cao', 'Thang cứu hộ 15m', 'Bình dưỡng khí', 'Máy cắt thủy lực'],
      ['Máy bơm nước 2000L/phút', 'Thang 18m', 'Bình khí nén', 'Búa phá tường'],
      ['Hệ thống bơm chính 3000L/phút', 'Thang mở rộng 20m', 'Thiết bị phá dỡ', 'Máy thổi khói'],
      ['Vòi rồng 50m', 'Thang cứu hộ 12m', 'Bộ cắt phá', 'Bộ đồ chống cháy'],
      ['Máy bơm nước cao cấp', 'Thang 22m', 'Thiết bị cứu hộ đặc biệt', 'Máy phát điện dự phòng'],
      ['Vòi phun bọt', 'Thang tự động 25m', 'Bình oxy cứu hộ', 'Bộ dụng cụ phá dỡ nặng']
    ]
  };
  
  const capacityByType = {
    'AMBULANCE': () => Math.floor(Math.random() * 3) + 2, // 2-4 người
    'POLICE': () => Math.floor(Math.random() * 4) + 4, // 4-7 người
    'FIRE_TRUCK': () => (Math.floor(Math.random() * 3) + 2) * 1000 // 2000-4000 lít
  };
  
  let globalIndex = 0;
  
  stations.forEach((station, stationIdx) => {
    for (let i = 1; i <= countPerStation; i++) {
      globalIndex++;
      const vehicleNum = String(globalIndex).padStart(3, '0');
      const vehicleId = `${typePrefix[type]}-${vehicleNum}`;
      
      // Generate realistic Vietnamese license plate (51 = TP.HCM)
      const licensePlate = `51${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 90000 + 10000)}`;
      
      // Random mission history (0-5 missions)
      const historyCount = Math.floor(Math.random() * 6);
      const missionHistory = generateMissionHistory(historyCount);
      
      // Assign status
      const statusInfo = assignVehicleStatus(globalIndex, stations.length * countPerStation);
      
      vehicles.push({
        vehicleId: vehicleId,
        type: type,
        licensePlate: licensePlate,
        station: {
          name: station.name,
          address: station.address
        },
        coverage: generateCoverage(),
        status: statusInfo.status,
        currentMission: statusInfo.currentMission,
        specifications: {
          capacity: capacityByType[type](),
          equipment: equipmentByType[type][i % equipmentByType[type].length]
        },
        missionHistory: missionHistory
      });
    }
  });
  
  return vehicles;
}

/**
 * Main seed function
 */
async function seedVehicles() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency_112', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Clear existing vehicles
    console.log('Clearing existing vehicles...');
    await Vehicle.deleteMany({});
    console.log('Existing vehicles cleared');
    
    // Generate vehicles
    console.log('Generating vehicles...');
    
    const ambulances = generateVehicles('AMBULANCE', ambulanceStations, 5); // 8 stations × 5 = 40 ambulances
    console.log(`Generated ${ambulances.length} ambulances`);
    
    const policeCars = generateVehicles('POLICE', policeStations, 4); // 10 stations × 4 = 40 police cars (adjusted to 35)
    console.log(`Generated ${policeCars.length} police cars`);
    
    const fireTrucks = generateVehicles('FIRE_TRUCK', fireStations, 4); // 7 stations × 4 = 28 fire trucks (adjusted to 25)
    console.log(`Generated ${fireTrucks.length} fire trucks`);
    
    // Adjust to exactly 100 vehicles (remove excess police cars)
    const adjustedPoliceCars = policeCars.slice(0, 35);
    const adjustedFireTrucks = fireTrucks.slice(0, 25);
    
    const allVehicles = [...ambulances, ...adjustedPoliceCars, ...adjustedFireTrucks];
    console.log(`Total vehicles: ${allVehicles.length}`);
    
    // Insert vehicles
    console.log('Inserting vehicles into database...');
    await Vehicle.insertMany(allVehicles);
    console.log('✅ Vehicles inserted successfully!');
    
    // Count vehicles by status
    const statusCounts = allVehicles.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {});
    
    // Display statistics
    console.log('\n📊 VEHICLE STATISTICS:');
    console.log(`   Ambulances: ${ambulances.length}`);
    console.log(`   Police Cars: ${adjustedPoliceCars.length}`);
    console.log(`   Fire Trucks: ${adjustedFireTrucks.length}`);
    console.log(`   Total: ${allVehicles.length}`);
    console.log('\n📈 STATUS DISTRIBUTION:');
    console.log(`   Available: ${statusCounts.AVAILABLE || 0}`);
    console.log(`   On Mission: ${statusCounts.ON_MISSION || 0}`);
    console.log(`   Maintenance: ${statusCounts.MAINTENANCE || 0}`);
    
    // Display coverage sample
    console.log('\n📍 COVERAGE SAMPLE (first 3 vehicles):');
    allVehicles.slice(0, 3).forEach(v => {
      console.log(`   ${v.vehicleId} (${v.licensePlate}) - ${v.station.name}`);
      console.log(`      Covers ${v.coverage.length} wards: ${v.coverage.map(c => c.ward).join(', ')}`);
    });
    
    console.log('\n✅ Seed completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding vehicles:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run seed if called directly
if (require.main === module) {
  seedVehicles();
}

module.exports = { seedVehicles };

