import { createStore } from "redux"

const LOGIN = "LOGIN"
const BIO_SETTING = "BIO_SETTING"
const DRIVER_SETTING = "DRIVER_SETTING"
const PASSENGER_SETTING = "PASSENGER_SETTING"
const SET_DRIVER = "SET_DRIVER"


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

function setDriver(value){
	return {
		type:SET_DRIVER,
		value
	}
}


const initialState = {
	user : -1, // -1 계정 없음 0, 1, 2,
	driver : false,
	setting:[false, true, false] // 생체인증, 운전자, 동승자
}

const reducer = (state = initialState, action) => {
	let newState = {...state}
	switch(action.type) {
		case LOGIN:
			newState.user = action.user
			break;
		case BIO_SETTING:
			newState.setting[0] = action.value
			break;
		case DRIVER_SETTING:
			newState.setting[1] = action.value
			break;
		case PASSENGER_SETTING:
			newState.setting[2] = action.value
			break;
		case SET_DRIVER:
			newState.driver = action.value
			break;
		default:
			break;
	}
	console.log('reducer!! ', newState)
	return newState;
	
}

const store = createStore(reducer);

export {
	store,
	login,
	bioSetting,
	driverSetting,
	passengerSetting,
	setDriver
}
