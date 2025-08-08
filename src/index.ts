/*
 *       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 *      ░░░        ░░░      ░░░  ░░░░  ░░        ░░░      ░░░░      ░░░  ░░░░  ░░       ░░░        ░░░
 *     ▒▒▒▒▒▒▒▒▒  ▒▒  ▒▒▒▒  ▒▒   ▒▒   ▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒▒▒▒▒▒
 *    ▓▓▓▓▓▓▓▓▓  ▓▓  ▓▓▓▓  ▓▓        ▓▓      ▓▓▓▓▓      ▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓  ▓▓       ▓▓▓      ▓▓▓▓▓
 *   ███  ████  ██        ██  █  █  ██  ██████████████  ██  ████  ██  ████  ██  ████  ██  █████████
 *  ████      ███  ████  ██  ████  ██        ███      ████      ████      ███       ███        ███
 * ████████████████████████████████████████████████████████████████████████████████████████████ 87 ▓▒░
*/

const pageId = "080f5186-e576-4195-a8de-b9f67985211b";

const hostSeed = "jamescube.notion.site"
const hostOrigin = "https://" + hostSeed
const hostId = pageId.replace(/-/g, "");
const hostPath = hostOrigin + "/" + hostId;

const proxyAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36';

export default {

	async fetchOptions(request: Request): Promise<Response> {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*', 
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400',
			},
		});
	},

	async fetchHost(request: Request): Promise<Response> {
		// 원본 페이지 요청
		const targetedResponse = await fetch(hostPath, {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; CloudflareWorker/1.0)",
		},
		});

		if (!targetedResponse.ok) {
			return new Response("Failed to fetch Notion page", { status: 502 });
		}

		let rawText = await targetedResponse.text();

		rawText =
			///////////////////////////////////////////////////////////////////////////
			// REF : https://github.com/stephenou/fruitionsite/blob/master/worker.js //
			///////////////////////////////////////////////////////////////////////////
			rawText.replace(
				/<\/head>/g,
				`<style>
				div.notion-topbar > div > div:nth-child(3) { display: none !important; }
				div.notion-topbar > div > div:nth-child(4) { display: none !important; }
				div.notion-topbar > div > div:nth-child(5) { display: none !important; }
				div.notion-topbar > div > div:nth-child(6) { display: none !important; }
				div.notion-topbar-mobile > div:nth-child(3) { display: none !important; }
				div.notion-topbar-mobile > div:nth-child(4) { display: none !important; }
				div.notion-topbar > div > div:nth-child(1n).toggle-mode { display: block !important; }
				div.notion-topbar-mobile > div:nth-child(1n).toggle-mode { display: block !important; }
				</style></head>`);

		return new Response(rawText, {
			headers: {
				"Content-Type": "text/html; charset=utf-8"
			},
		});
	},

	async fetchRaw(request: Request): Promise<Response> {

		//
		const requestUrl = new URL(request.url);

		// RAW제거
		const targetUrl = new URL(requestUrl.pathname.replace(/^\/raw(?=\/|$)/, ""), requestUrl.origin);
		const targetRequest = new Request(
			targetUrl.toString(), request
		);

		return await fetch(targetRequest);
	},

	async fetchApi(request: Request): Promise<Response> {
		
		//
		const requestUrl = new URL(request.url);

		// Worker로 들어온 경로를 그대로 Notion에 붙이기
		const targetUrl = new URL(requestUrl.pathname + requestUrl.search, hostOrigin);
		let targetMethod = request.method;
		let targetHeaders = new Headers();

		targetHeaders.set("Content-Type", 'application/json; charset=UTF-8');
		targetHeaders.set("User-Agent", proxyAgent);
		targetHeaders.set("Host", hostSeed);
		targetHeaders.set("Origin", hostOrigin);
		targetHeaders.set("Referer", hostPath);

		targetMethod = 'POST';

		const targetedResponse = await fetch(targetUrl.toString(), {
			headers: targetHeaders,
			method: targetMethod,
			body: request.body
		});

		let rawText = await targetedResponse.text();

		const responseStatus = targetedResponse.status;
		const responseHeaders = new Headers(targetedResponse.headers);

		let resultResponse = new Response(rawText, targetedResponse);

		resultResponse.headers.set('Access-Control-Allow-Origin', '*');
		resultResponse.headers.set('Access-Control-Allow-Headers', '*');
		
		return resultResponse;
	},

	async fetchScript(request: Request): Promise<Response> {

		const requestUrl = new URL(request.url);
		const targetUrl = new URL(requestUrl.pathname + requestUrl.search, hostOrigin);

		const targetedResponse = await fetch(targetUrl.toString(), {
		headers: request.headers,
		method: request.method,
		body: request.method !== 'GET' && request.method !== 'HEAD'
			? request.body
			: undefined,
		});

		let rawText = await targetedResponse.text();

		if(requestUrl.pathname.includes("app")) {
			rawText = 
				`const replaceState = window.history.replaceState; window.history.replaceState = function(state) {};\n`
				 + rawText;
		}

		rawText = 
			`var windowlocationhref="${hostPath}"; var windowlocationhost="${hostSeed}"; ` + 
			`var windowlocationhostname="${hostSeed}"; var windowlocationorigin="${hostOrigin}";\n`
			+ rawText;

		rawText = 
			rawText.replaceAll(
				/window\.location\.href/g,
				"windowlocationhref"
			);

		rawText = 
			rawText.replaceAll(
				/window\.location\.host/g,
				"windowlocationhost"
			);

		rawText = 
			rawText.replaceAll(
				/window\.location\.origin/g,
				"windowlocationorigin"
			);

		const responseHeaders = new Headers(targetedResponse.headers);

		responseHeaders.set("Content-Type", "application/javascript; charset=utf-8");
		responseHeaders.set('Access-Control-Allow-Origin', '*');
		responseHeaders.set('Access-Control-Allow-Headers', '*');

		return new Response(rawText, {
			status: targetedResponse.status,
			headers: responseHeaders,
		});
	},

	async fetchElse(request: Request): Promise<Response> {
		
		const requestUrl = new URL(request.url);
		const targetUrl = new URL(requestUrl.pathname + requestUrl.search, hostOrigin);

		const targetedResponse = await fetch(targetUrl.toString(), {
		headers: request.headers,
		method: request.method,
		body: request.method !== 'GET' && request.method !== 'HEAD'
			? request.body
			: undefined,
		});

		const responseHeaders = new Headers(targetedResponse.headers);

		responseHeaders.set('Access-Control-Allow-Origin', '*');
		responseHeaders.set('Access-Control-Allow-Headers', '*');

		return new Response(targetedResponse.body, {
			status: targetedResponse.status,
			headers: responseHeaders,
		});
	},

	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {

		const requestUrl = new URL(request.url);
		
		if(request.method === "OPTIONS") {
			return this.fetchOptions(request);
  		}

		// ROOT인 경우, 타겟 페이지로 프록시 하기
		else if(requestUrl.pathname == '/') {
			return this.fetchHost(request);
		}

		else if(requestUrl.pathname.startsWith("/raw")) {
			return this.fetchRaw(request);
		}

		else if(requestUrl.pathname.startsWith("/api")) {
			return this.fetchApi(request);
		}

		else if(requestUrl.pathname.endsWith(".js")) {
			return this.fetchScript(request);
		}

		else {
			return this.fetchElse(request);
		}
	}
};

