import React, { useState, useEffect } from 'react';
import '../styles/VehicleForm.css';

const VEHICLE_TYPES = [
  { value: 'AMBULANCE', label: 'Xe cấp cứu' },
  { value: 'POLICE', label: 'Xe công an' },
  { value: 'FIRE_TRUCK', label: 'Xe cứu hỏa' }
];

const HCM_WARDS = {
  'Quận 1': [
    'Phường Bến Nghé', 'Phường Bến Thành', 'Phường Nguyễn Thái Bình',
    'Phường Phạm Ngũ Lão', 'Phường Cầu Ông Lãnh', 'Phường Tân Định',
    'Phường Đa Kao', 'Phường Nguyễn Cư Trinh', 'Phường Cô Giang', 'Phường Cầu Kho'
  ],
  'Quận 3': Array.from({ length: 14 }, (_, i) => `Phường ${i + 1}`),
  'Quận 5': Array.from({ length: 15 }, (_, i) => `Phường ${i + 1}`),
  'Quận Bình Thạnh': [
    'Phường 1', 'Phường 2', 'Phường 3', 'Phường 5', 'Phường 6',
    'Phường 7', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14',
    'Phường 15', 'Phường 17', 'Phường 19', 'Phường 21', 'Phường 22',
    'Phường 24', 'Phường 25', 'Phường 26', 'Phường 27', 'Phường 28'
  ],
  'Quận Tân Bình': Array.from({ length: 15 }, (_, i) => `Phường ${i + 1}`)
};

function VehicleForm({ vehicle, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    vehicleId: '',
    type: 'AMBULANCE',
    licensePlate: '',
    station: {
      name: '',
      address: ''
    },
    coverage: [],
    specifications: {
      capacity: '',
      equipment: ['']
    }
  });
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWards, setSelectedWards] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        vehicleId: vehicle.vehicleId || '',
        type: vehicle.type || 'AMBULANCE',
        licensePlate: vehicle.licensePlate || '',
        station: {
          name: vehicle.station?.name || '',
          address: vehicle.station?.address || ''
        },
        coverage: vehicle.coverage || [],
        specifications: {
          capacity: vehicle.specifications?.capacity || '',
          equipment: vehicle.specifications?.equipment?.length > 0 
            ? vehicle.specifications.equipment 
            : ['']
        }
      });
      
      // Set initial selected wards
      if (vehicle.coverage && vehicle.coverage.length > 0) {
        setSelectedDistrict(vehicle.coverage[0].district);
        setSelectedWards(vehicle.coverage.map(c => c.ward));
      }
    }
  }, [vehicle]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      station: {
        ...prev.station,
        [field]: value
      }
    }));
  };

  const handleSpecificationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [field]: value
      }
    }));
  };

  const handleEquipmentChange = (index, value) => {
    setFormData(prev => {
      const newEquipment = [...prev.specifications.equipment];
      newEquipment[index] = value;
      return {
        ...prev,
        specifications: {
          ...prev.specifications,
          equipment: newEquipment
        }
      };
    });
  };

  const addEquipment = () => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        equipment: [...prev.specifications.equipment, '']
      }
    }));
  };

  const removeEquipment = (index) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        equipment: prev.specifications.equipment.filter((_, i) => i !== index)
      }
    }));
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    setSelectedWards([]);
  };

  const handleWardToggle = (ward) => {
    setSelectedWards(prev => {
      if (prev.includes(ward)) {
        return prev.filter(w => w !== ward);
      } else {
        return [...prev, ward];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.vehicleId.trim()) {
      setError('Vui lòng nhập mã xe');
      return;
    }
    if (!formData.licensePlate.trim()) {
      setError('Vui lòng nhập biển số xe');
      return;
    }
    if (!formData.station.name.trim()) {
      setError('Vui lòng nhập tên trạm/đơn vị');
      return;
    }
    if (selectedWards.length === 0) {
      setError('Vui lòng chọn ít nhất một phường/xã');
      return;
    }

    // Build coverage from selected wards
    const coverage = selectedWards.map(ward => ({
      ward: ward,
      district: selectedDistrict,
      city: 'Thành phố Hồ Chí Minh'
    }));

    // Clean equipment list
    const equipment = formData.specifications.equipment
      .filter(item => item.trim() !== '');

    const submitData = {
      ...formData,
      coverage: coverage,
      specifications: {
        capacity: parseInt(formData.specifications.capacity) || 0,
        equipment: equipment
      }
    };

    try {
      setSubmitting(true);
      await onSubmit(submitData);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content vehicle-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{vehicle ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="vehicle-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Mã xe *</label>
              <input
                type="text"
                value={formData.vehicleId}
                onChange={(e) => handleChange('vehicleId', e.target.value)}
                placeholder="VD: CC-001"
                disabled={!!vehicle}
              />
            </div>

            <div className="form-group">
              <label>Loại xe *</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                {VEHICLE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Biển số xe *</label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) => handleChange('licensePlate', e.target.value)}
              placeholder="VD: 51A-12345"
            />
          </div>

          <div className="form-group">
            <label>Tên trạm/đơn vị *</label>
            <input
              type="text"
              value={formData.station.name}
              onChange={(e) => handleStationChange('name', e.target.value)}
              placeholder="VD: Bệnh viện Chợ Rẫy"
            />
          </div>

          <div className="form-group">
            <label>Địa chỉ trạm</label>
            <input
              type="text"
              value={formData.station.address}
              onChange={(e) => handleStationChange('address', e.target.value)}
              placeholder="VD: 201B Nguyễn Chí Thanh, Quận 5"
            />
          </div>

          <div className="form-group">
            <label>Phạm vi hoạt động *</label>
            <div className="coverage-selector">
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="district-select"
              >
                <option value="">-- Chọn quận/huyện --</option>
                {Object.keys(HCM_WARDS).map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>

              {selectedDistrict && (
                <div className="wards-checkbox-group">
                  {HCM_WARDS[selectedDistrict].map(ward => (
                    <label key={ward} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedWards.includes(ward)}
                        onChange={() => handleWardToggle(ward)}
                      />
                      {ward}
                    </label>
                  ))}
                </div>
              )}
              
              {selectedWards.length > 0 && (
                <div className="selected-wards">
                  <strong>Đã chọn {selectedWards.length} phường/xã</strong>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Sức chứa/Dung tích</label>
            <input
              type="number"
              value={formData.specifications.capacity}
              onChange={(e) => handleSpecificationChange('capacity', e.target.value)}
              placeholder={formData.type === 'FIRE_TRUCK' ? 'Lít nước' : 'Số người'}
            />
          </div>

          <div className="form-group">
            <label>Trang thiết bị</label>
            {formData.specifications.equipment.map((item, index) => (
              <div key={index} className="equipment-item">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleEquipmentChange(index, e.target.value)}
                  placeholder="Tên thiết bị"
                />
                {formData.specifications.equipment.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEquipment(index)}
                    className="btn-remove-equipment"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addEquipment}
              className="btn-add-equipment"
            >
              + Thêm thiết bị
            </button>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : (vehicle ? 'Cập nhật' : 'Tạo mới')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VehicleForm;
