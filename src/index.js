const fetchJSON = async (url) => {
	const response = await fetch(url, {
		cf: {
			cacheEverything: false,
			cacheTtl: 0,
		},
	});
	return response.json();
};

const fetchUserInfo = async (member, env) => {
	const memberInfo = await env.MEMBERS.get(member);
	if (memberInfo) {
		console.log(`Found ${member} in cache`)
		return JSON.parse(memberInfo);
	}
	console.log(`Fetching ${member} from API`)
	const data = await fetchJSON(`https://www.duolingo.com/2017-06-30/users?username=${member}`);
	env.MEMBERS.put(member, JSON.stringify(data), { expirationTtl: 86400 });
	return data;
};

const fetchUserPoints = async (member) => {
	let now = new Date(new Date().toLocaleString('en-US', { timeZone: "Asia/Ho_Chi_Minh" }));
	let dayOfWeek = now.getDay();
	let hour = now.getHours();
	let isFreezeTime = (dayOfWeek >= 6 || dayOfWeek === 0);
	let isReportingTime = (dayOfWeek === 1 && hour >= 0 && hour < 10);

	let startDate = new Date(new Date().toLocaleString('en-US', { timeZone: "Asia/Ho_Chi_Minh" }));
	startDate.setDate(startDate.getDate() - (startDate.getDay() || 7) + 1);

	let endDate = new Date(
		new Date().toLocaleString('en-US', { timeZone: "Asia/Ho_Chi_Minh" })
	);
	endDate.setDate(endDate.getDate());
	if (isReportingTime) {
		endDate.setDate(endDate.getDate() - 1);
		startDate.setDate(startDate.getDate() - 7);
	} else if (isFreezeTime) {
		endDate.setDate(endDate.getDate() - (endDate.getDay() - 5));
	}

	const url = `https://www.duolingo.com/2017-06-30/users/${member}/xp_summaries?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
	console.log(url);
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
			const points = await fetchUserPoints(memberUsername);
			return new Response(JSON.stringify(points), { headers: respHeaders });
		} else {
			const memberUsername = lastSegment;
			const member = await fetchUserInfo(memberUsername, env);
			return new Response(JSON.stringify(member), { headers: respHeaders });
		}
	},
};
