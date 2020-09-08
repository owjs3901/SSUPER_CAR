const express = require('express');
const router = express.Router();

const base64url = require('base64url');

const utils = require('./utils')

const db = {}

router.use(function timeLog(req, res, next) {
	console.log('Time: ', Date.now());
	next();
});

let randomBase64URLBuffer = (len) => {
	len = len || 32;

	let buff = crypto.randomBytes(len);

	return base64url(buff);
}
router.get('/logout', (req, res) => {
	req.session.loggedIn = false;
	req.session.username = undefined;

	res.json({
		'status': 'ok'
	})
})
router.get('/', (req, res) => {
	if (req.session.username && req.session.challenge)
		res.render('main.html')
	else
		res.render('login.html')
})

router.get('/personalInfo', (req, res) => {
	if (!req.session.loggedIn) {
		res.json({
			'status': 'failed',
			'message': 'Access denied'
		})
	} else {
		res.json({
			'status': 'ok',
			'name': db[req.session.username].name,
		})
	}
})
router.get('/register', (req, res) => {
	if (req.session.username && req.session.challenge)
		res.redirect('/')
	else
		res.render('register.html')
})

router.post('/register', (req, res) => {
	if (req.body && req.body.username && req.body.name) {
		if (!db[req.body.username]) {
			db[req.body.username] = {
				name: req.body.name,
				authenticators: [],
				registered: false,
				id: randomBase64URLBuffer(32),
			}
			const c = randomBase64URLBuffer(32)

			req.session.challenge = c;
			req.session.username = req.body.username;

			res.json({
				stat: 0,
				challenge: c,
				rp: {
					name: 'FIDO Example'
				},
				user: {
					id: db[req.body.username].id,
					name: req.body.username,
					displayName: req.body.name
				},
				attestation: 'direct',
				authenticatorSelection: {
					authenticatorAttachment: "cross-platform",
				},
				pubKeyCredParams: [
					{
						type: "public-key", alg: -7 // "ES256" IANA COSE Algorithms registry
					}
				]
			})
		}
		else
			res.json({
				stat: 1,
				msg: '이미 존재하는 유저네임'
			})
	}
	else res.json({
		stat: 1,
		msg: '알맞지 않는 인자 [' + req.body.username + req.body.name + "]"
	})

})
router.post('/dologin', (req, res) => {

	if (!req.body || !req.body.username) {
		res.json({
			'status': 'failed',
			'message': 'Request missing username field!'
		})

		return
	}

	let username = req.body.username;

	if (!db[username] || !db[username].registered) {
		res.json({
			'status': 'failed',
			'message': `User ${username} does not exist!`
		})

		return
	}

	let getAssertion = utils.generateServerGetAssertion(db[username].authenticators)
	getAssertion.status = 'ok'

	req.session.challenge = getAssertion.challenge;
	req.session.username = username;
	res.json(getAssertion)

})
router.post('/response', (req, res) => {
	if (!req.body || !req.body.id
		|| !req.body.rawId || !req.body.response
		|| !req.body.type || req.body.type !== 'public-key') {
		res.json({
			'status': 'failed',
			'message': 'Response missing one or more of id/rawId/response/type fields, or type is not public-key!'
		})

		return
	}

	let webauthnResp = req.body
	let clientData = JSON.parse(base64url.decode(webauthnResp.response.clientDataJSON));

	/* Check challenge... */

	if (clientData.challenge !== req.session.challenge) {
		res.json({
			'status': 'failed',
			'message': 'Challenges don\'t match!'
		})
	}

	let result;


	if (webauthnResp.response.attestationObject !== undefined) {
		result = utils.verifyAuthenticatorAttestationResponse(webauthnResp);

		if (result.verified) {
			db[req.session.username].authenticators.push(result.authrInfo);
			db[req.session.username].registered = true
		}
	} else if (webauthnResp.response.authenticatorData !== undefined) {
		result = utils.verifyAuthenticatorAssertionResponse(webauthnResp, db[req.session.username].authenticators);

	} else {
		res.json({
			'status': 'failed',
			'message': 'Can not determine type of response!'
		})
		return;
	}
	if (result.verified) {
		req.session.loggedIn = true;
		res.json({ 'status': 0 })
	} else {
		res.json({
			'status': 'failed',
			'message': 'Can not authenticate signature!'
		})
	}
})
module.exports = router;
