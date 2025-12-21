import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import vehicleService from '../services/vehicleService';
import '../styles/VehicleDetailPage.css';

function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVehicleDetails();
  }, [id]);

  const fetchVehicleDetails = async () => {
    try {
      setLoading(true);
      const [vehicleResponse, historyResponse] = await Promise.all([
        vehicleService.getVehicle(id),
        vehicleService.getVehicleHistory(id)
      ]);
      
      setVehicle(vehicleResponse.data);
      setHistory(historyResponse.data.history || []);
      setError('');
    } catch (err) {
      console.error('Error fetching vehicle details:', err);
      setError('Không thể tải thông tin xe. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'status-available';
      case 'ON_MISSION':
        return 'status-on-mission';
      case 'MAINTENANCE':
        return 'status-maintenance';
      default:
        return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Sẵn sàng';
      case 'ON_MISSION':
        return 'Đang làm nhiệm vụ';
      case 'MAINTENANCE':
        return 'Bảo trì';
      default:
        return status;
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'AMBULANCE':
        return 'Xe cấp cứu';
      case 'POLICE':
        return 'Xe công an';
      case 'FIRE_TRUCK':
        return 'Xe cứu hỏa';
      default:
        return type;
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) {
      return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (error || !vehicle) {
    return (
      <div className="error-container">
        <div className="error-message">{error || 'Không tìm thấy xe'}</div>
        <button onClick={() => navigate('/vehicles')} className="btn-primary">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="vehicle-detail-page">
      <div className="page-header">
        <button onClick={() => navigate('/vehicles')} className="btn-back">
          ← Quay lại
        </button>
        <h1>Chi tiết xe {vehicle.vehicleId}</h1>
      </div>

      <div className="vehicle-detail-container">
        {/* Basic Info */}
        <div className="info-section">
          <h2>Thông tin cơ bản</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Mã xe:</label>
              <span className="value">{vehicle.vehicleId}</span>
            </div>
            <div className="info-item">
              <label>Loại xe:</label>
              <span className="value">{getTypeText(vehicle.type)}</span>
            </div>
            <div className="info-item">
              <label>Biển số:</label>
              <span className="value license-plate">{vehicle.licensePlate}</span>
            </div>
            <div className="info-item">
              <label>Trạng thái:</label>
              <span className={`status-badge ${getStatusColor(vehicle.status)}`}>
                {getStatusText(vehicle.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Station Info */}
        <div className="info-section">
          <h2>Trạm/Đơn vị chủ quản</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Tên trạm:</label>
              <span className="value">{vehicle.station.name}</span>
            </div>
            <div className="info-item">
              <label>Địa chỉ:</label>
              <span className="value">{vehicle.station.address}</span>
            </div>
          </div>
        </div>

        {/* Coverage */}
        <div className="info-section">
          <h2>Phạm vi hoạt động ({vehicle.coverage.length} phường/xã)</h2>
          <div className="coverage-list">
            {vehicle.coverage.map((area, index) => (
              <div key={index} className="coverage-item">
                {area.ward}, {area.district}
              </div>
            ))}
          </div>
        </div>

        {/* Specifications */}
        <div className="info-section">
          <h2>Thông số kỹ thuật</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Sức chứa/Dung tích:</label>
              <span className="value">
                {vehicle.specifications.capacity}{' '}
                {vehicle.type === 'FIRE_TRUCK' ? 'lít' : 'người'}
              </span>
            </div>
          </div>
          {vehicle.specifications.equipment && vehicle.specifications.equipment.length > 0 && (
            <div className="equipment-list">
              <h3>Trang thiết bị:</h3>
              <ul>
                {vehicle.specifications.equipment.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Current Mission */}
        {vehicle.status === 'ON_MISSION' && vehicle.currentMission && (
          <div className="info-section mission-current">
            <h2>Nhiệm vụ hiện tại</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Mã phiếu:</label>
                <a href={`/tickets/${vehicle.currentMission.ticketId}`} className="ticket-link">
                  {vehicle.currentMission.ticketId}
                </a>
              </div>
              <div className="info-item">
                <label>Thời gian xuất phát:</label>
                <span className="value">
                  {new Date(vehicle.currentMission.assignedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mission History */}
        <div className="info-section">
          <h2>Lịch sử xuất động ({history.length} lần)</h2>
          {history.length === 0 ? (
            <p className="no-data">Chưa có lịch sử xuất động</p>
          ) : (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Loại sự cố</th>
                    <th>Địa điểm</th>
                    <th>Thời gian xuất phát</th>
                    <th>Thời gian hoàn thành</th>
                    <th>Thời lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((mission, index) => (
                    <tr key={index}>
                      <td>
                        {mission.ticket ? (
                          <a href={`/tickets/${mission.ticketId}`} className="ticket-link">
                            {mission.ticketId}
                          </a>
                        ) : (
                          mission.ticketId
                        )}
                      </td>
                      <td>
                        {mission.ticket?.emergencyType === 'FIRE_RESCUE' && 'PCCC & Cứu hộ'}
                        {mission.ticket?.emergencyType === 'MEDICAL' && 'Cấp cứu y tế'}
                        {mission.ticket?.emergencyType === 'SECURITY' && 'An ninh'}
                      </td>
                      <td className="location-cell">
                        {mission.ticket?.location?.address || 'N/A'}
                      </td>
                      <td>{new Date(mission.assignedAt).toLocaleString('vi-VN')}</td>
                      <td>
                        {mission.completedAt
                          ? new Date(mission.completedAt).toLocaleString('vi-VN')
                          : '-'}
                      </td>
                      <td>{mission.duration ? formatDuration(mission.duration) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VehicleDetailPage;
