import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import vehicleService from '../services/vehicleService';
import VehicleForm from '../components/VehicleForm';
import '../styles/VehiclesPage.css';

function VehiclesPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalVehicles: 0
  });
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    fetchVehicles();
    fetchStatistics();
  }, [filters]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehicleService.getVehicles(filters);
      setVehicles(response.data);
      setPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalVehicles: response.totalVehicles
      });
      setError('');
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Không thể tải danh sách xe. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await vehicleService.getStatistics();
      setStatistics(response.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to page 1 when filter changes
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleCreateVehicle = () => {
    setEditingVehicle(null);
    setShowForm(true);
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa xe này?')) {
      return;
    }

    try {
      await vehicleService.deleteVehicle(vehicleId);
      fetchVehicles();
      fetchStatistics();
      alert('Đã xóa xe thành công');
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      alert('Không thể xóa xe. Vui lòng thử lại.');
    }
  };

  const handleUpdateStatus = async (vehicleId, newStatus) => {
    try {
      await vehicleService.updateVehicleStatus(vehicleId, newStatus);
      fetchVehicles();
      fetchStatistics();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const handleFormSubmit = async (vehicleData) => {
    try {
      if (editingVehicle) {
        await vehicleService.updateVehicle(editingVehicle._id, vehicleData);
        alert('Đã cập nhật xe thành công');
      } else {
        await vehicleService.createVehicle(vehicleData);
        alert('Đã tạo xe mới thành công');
      }
      setShowForm(false);
      setEditingVehicle(null);
      fetchVehicles();
      fetchStatistics();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      throw err;
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

  const isAdmin = user && user.role === 'admin';

  return (
    <div className="vehicles-page">
      <div className="page-header">
        <h1>Quản lý Xe Cứu hộ</h1>
        {isAdmin && (
          <button className="btn-primary" onClick={handleCreateVehicle}>
            + Thêm xe mới
          </button>
        )}
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="statistics-cards">
          <div className="stat-card">
            <h3>{statistics.total}</h3>
            <p>Tổng số xe</p>
          </div>
          <div className="stat-card stat-available">
            <h3>{statistics.available}</h3>
            <p>Sẵn sàng</p>
          </div>
          <div className="stat-card stat-on-mission">
            <h3>{statistics.onMission}</h3>
            <p>Đang làm nhiệm vụ</p>
          </div>
          <div className="stat-card stat-maintenance">
            <h3>{statistics.maintenance}</h3>
            <p>Bảo trì</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Loại xe:</label>
          <select 
            value={filters.type} 
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="AMBULANCE">Xe cấp cứu</option>
            <option value="POLICE">Xe công an</option>
            <option value="FIRE_TRUCK">Xe cứu hỏa</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Trạng thái:</label>
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="AVAILABLE">Sẵn sàng</option>
            <option value="ON_MISSION">Đang làm nhiệm vụ</option>
            <option value="MAINTENANCE">Bảo trì</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Vehicles table */}
      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : (
        <>
          <div className="vehicles-table-container">
            <table className="vehicles-table">
              <thead>
                <tr>
                  <th>Mã xe</th>
                  <th>Loại xe</th>
                  <th>Biển số</th>
                  <th>Trạm/Đơn vị</th>
                  <th>Phạm vi hoạt động</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      Không có xe nào
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle._id}>
                      <td className="vehicle-id">{vehicle.vehicleId}</td>
                      <td>{getTypeText(vehicle.type)}</td>
                      <td className="license-plate">{vehicle.licensePlate}</td>
                      <td>{vehicle.station?.name}</td>
                      <td className="coverage">
                        {vehicle.coverage.length > 0 ? (
                          <span title={vehicle.coverage.map(c => c.ward).join(', ')}>
                            {vehicle.coverage.length} phường/xã
                          </span>
                        ) : (
                          'Chưa gán'
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor(vehicle.status)}`}>
                          {getStatusText(vehicle.status)}
                        </span>
                      </td>
                      <td className="actions">
                        <button 
                          className="btn-small btn-view"
                          onClick={() => window.location.href = `/vehicles/${vehicle._id}`}
                        >
                          Xem
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              className="btn-small btn-edit"
                              onClick={() => handleEditVehicle(vehicle)}
                            >
                              Sửa
                            </button>
                            <button 
                              className="btn-small btn-delete"
                              onClick={() => handleDeleteVehicle(vehicle._id)}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                        {vehicle.status === 'ON_MISSION' && (
                          <button 
                            className="btn-small btn-release"
                            onClick={() => handleUpdateStatus(vehicle._id, 'AVAILABLE')}
                          >
                            Giải phóng
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                ‹ Trước
              </button>
              <span>
                Trang {pagination.currentPage} / {pagination.totalPages}
              </span>
              <button 
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Sau ›
              </button>
            </div>
          )}
        </>
      )}

      {/* Vehicle Form Modal */}
      {showForm && (
        <VehicleForm
          vehicle={editingVehicle}
          onClose={() => {
            setShowForm(false);
            setEditingVehicle(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

export default VehiclesPage;

