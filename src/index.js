/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const fetchJSON = async (url) => {
	const response = await fetch(url, {
		cf: {
			cacheEverything: true,
			cacheTtl: 0,
		},
	});
	return response.json();
};

// Frozen time: return true if current time is 9pm Sunday to 10am of Monday
const isWeekend = () => {
	const today = new Date(
		new Date().toLocaleString('en-US', { timeZone: request.cf.timezone })
	);
	const day = today.getDay();
	const hour = today.getHours();
	return (day === 0 && hour >= 21) || (day === 1 && hour < 10);
};

const fetchUserInfo = async (member) => {
	const url = `https://www.duolingo.com/2017-06-30/users?username=${member}`;
	return fetchJSON(url);
};

const fetchUserPoints = async (member, request) => {
	// Set timezone to the client's timezone.
	const endDate = new Date(
		new Date().toLocaleString('en-US', { timeZone: request.cf.timezone })
	)
	if (isWeekend()) {
		endDate.setDate(endDate.getDate() - 1);
	} else {
		endDate.setDate(endDate.getDate());
	}
	const startDate = new Date(
		new Date().toLocaleString('en-US', { timeZone: request.cf.timezone })
	)
	startDate.setDate(startDate.getDate() - 6);
	const url = `https://www.duolingo.com/2017-06-30/users/${member}/xp_summaries?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
	return fetchJSON(url);
};

export default {
	async fetch(request, env, ctx) {
		let respHeaders = {
			"Access-Control-Allow-Origin": env.FRONTEND_URL,
			"Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
			"Access-Control-Max-Age": "86400",
			"Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers"),
		};

		const urlSegments = new URL(request.url).pathname.split('/');
		const lastSegment = urlSegments.pop();

		if (!lastSegment) {
			return new Response('No member specified');
		}

		if (lastSegment === 'points') {
			const memberUsername = urlSegments.pop();
			if (!memberUsername) {
				return new Response('No member specified');
			}
			const points = await fetchUserPoints(memberUsername, request);
			return new Response(JSON.stringify(points), { headers: respHeaders });
		} else {
			console.log(lastSegment);
			const memberUsername = lastSegment;
			const member = await fetchUserInfo(memberUsername);
			return new Response(JSON.stringify(member), { headers: respHeaders });
		}
	},
};
