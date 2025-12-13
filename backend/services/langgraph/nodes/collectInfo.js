const { hasCompleteLocation } = require('../state');

/**
 * Collection Nodes
 * These nodes ask for specific information if it's missing
 * Each node generates a Vietnamese prompt asking for the missing info
 */

/**
 * Collect Location Node
 * Asks for complete address if missing
 */
async function collectLocationNode(state) {
  console.log('[CollectLocation] Current location:', state.location);
  
  let prompt = '';
  
  // Check what parts of location are missing
  if (!state.location.address) {
    prompt = 'Bạn đang ở đâu? Cho tôi địa chỉ đầy đủ (số nhà hoặc điểm mốc, tên đường, phường/xã, tỉnh/thành phố).';
  } else if (!state.location.ward && !state.location.city) {
    prompt = 'Phường/xã nào? Tỉnh/thành phố nào?';
  } else if (!state.location.ward) {
    prompt = 'Phường hoặc xã nào?';
  } else if (!state.location.city) {
    prompt = 'Tỉnh hoặc thành phố nào?';
  } else {
    // Should not reach here, but handle gracefully
    prompt = 'Vui lòng xác nhận lại địa chỉ đầy đủ.';
  }
  
  return {
    response: prompt,
    messages: [{
      role: 'operator',
      message: prompt,
      timestamp: new Date(),
    }],
  };
}

/**
 * Collect Emergency Type Node
 * Asks about the type of emergency
 */
async function collectEmergencyNode(state) {
  console.log('[CollectEmergency] Current emergencyTypes:', state.emergencyTypes);
  
  const prompt = 'Chuyện gì đang xảy ra? Có ai bị thương không?';
  
  return {
    response: prompt,
    messages: [{
      role: 'operator',
      message: prompt,
      timestamp: new Date(),
    }],
  };
}

/**
 * Collect Phone Node
 * Asks for contact phone number
 */
async function collectPhoneNode(state) {
  console.log('[CollectPhone] Current phone:', state.phone);
  
  const prompt = 'Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.';
  
  return {
    response: prompt,
    messages: [{
      role: 'operator',
      message: prompt,
      timestamp: new Date(),
    }],
  };
}

/**
 * Collect Affected People Node
 * Asks about number of people affected
 */
async function collectPeopleNode(state) {
  console.log('[CollectPeople] Current affectedPeople:', state.affectedPeople);
  
  let prompt = 'Có bao nhiêu người cần trợ giúp?';
  
  // If we know it's a medical or fire emergency, be more specific
  if (state.emergencyTypes.includes('MEDICAL')) {
    prompt = 'Có bao nhiêu người bị thương? Có ai nguy kịch không?';
  } else if (state.emergencyTypes.includes('FIRE_RESCUE')) {
    prompt = 'Có bao nhiêu người bị ảnh hưởng? Có ai bị mắc kẹt không?';
  }
  
  return {
    response: prompt,
    messages: [{
      role: 'operator',
      message: prompt,
      timestamp: new Date(),
    }],
  };
}

module.exports = {
  collectLocationNode,
  collectEmergencyNode,
  collectPhoneNode,
  collectPeopleNode,
};

