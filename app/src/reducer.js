
const LOGIN = "LOGIN"
const BIO_SETTING = "BIO_SETTING"
const DRIVER_SETTING = "DRIVER_SETTING"
const PASSENGER_SETTING = "PASSENGER_SETTING"

/**
 *
 * @param user number
 * @returns {{type: string}}
 */
function login(user){
	return {
		type:LOGIN,
		user:user
	}
}
function bioSetting(value){
	return {
		type:BIO_SETTING,
		value
	}
}

function driverSetting(value){
	return {
		type:DRIVER_SETTING,
		value
	}
}
function passengerSetting(value){
	return {
		type:PASSENGER_SETTING,
		value
	}
}

const initialState = {
	user : -1, // -1 계정 없음 0, 1, 2
	setting:[false, true, false] // 생체인증, 운전자, 동승자
}

const reducer = (state = initialState, action) => {
	switch(action.type) {
		case LOGIN:
			state.user = action.user
			break;
		case BIO_SETTING:
			state.state.setting[0] = action.value
			break;
		case DRIVER_SETTING:
			state.state.setting[1] = action.value
			break;
		case PASSENGER_SETTING:
			state.state.setting[2] = action.value
			break;
		default:
			break;
	}
	return state;
}

export {
	reducer,
	login,
	bioSetting,
	driverSetting,
	passengerSetting
}
