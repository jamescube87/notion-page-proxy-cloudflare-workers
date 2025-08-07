/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const pageId = "080f5186-e576-4195-a8de-b9f67985211b";

const hostSeed = "jamescube.notion.site"
const hostOrigin = "https://" + hostSeed
const hostId = pageId.replace(/-/g, "");
const hostPath = hostOrigin + "/" + hostId;

const proxyAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36';

export default {

	async fetchOptions(request: Request): Promise<Response> {
		return new Response()
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

		return new Response(rawText, {
			headers: {
				// "Content-Type": "text/raw; charset=utf-8"
				"Content-Type": "text/html; charset=utf-8"
			},
		});
	},

	async fetchApi(request: Request): Promise<Response> {
		
		//
		const requestUrl = new URL(request.url);

		// Worker로 들어온 경로를 그대로 Notion에 붙이기
		const targetUrl = new URL(requestUrl.pathname + requestUrl.search, hostOrigin);
		let targetMethod = request.method;
		let targetHeaders = new Headers();

		if (requestUrl.pathname == '/api/v3/getStatsigResults') { 
			for(const [key, value] of request.headers) {
				console.log(`I-Header: ${key} = ${value}`);
			}
		}
		
		targetHeaders.set("content-type", 'application/json; charset=UTF-8');
		targetHeaders.set("user-agent", proxyAgent);
		targetHeaders.set("host", hostSeed);
		targetHeaders.set("origin", hostOrigin);
		targetHeaders.set("referer", hostPath);

		targetMethod = 'POST';

		const targetedResponse = await fetch(targetUrl.toString(), {
			headers: targetHeaders,
			method: targetMethod,
			body: await request.body
		});

		let rawText = await targetedResponse.text();

		// 응답 헤더 복사 및 CORS 허용
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
			? await request.body
			: undefined,
		});

		let rawText = await targetedResponse.text();

			console.log('ASCRPT >> ' + requestUrl.pathname);

		if(requestUrl.pathname.includes("app")) {
			console.log('APP >> ' + requestUrl.pathname);
			rawText = 
				`const replaceState = window.history.replaceState\n`+
      			`window.history.replaceState = function(state) {\n` +
      			`};\n` + rawText;
		}

		rawText = 
			("var windowlocationhref=`" + hostPath + "`;\n") +
			("var windowlocationhost=`" + hostSeed + "`;\n") + 
			("var windowlocationhostname=`" + hostSeed + "`;\n") + 
			("var windowlocationorigin=`" + hostOrigin + "`;\n") + rawText;

		rawText = 
			rawText.replaceAll(
				/window.location.href/g,
				"windowlocationhref"
			);

		rawText = 
			rawText.replaceAll(
				/window.location.host/g,
				"windowlocationhost"
			);

		rawText = 
			rawText.replaceAll(
				/window.location.origin/g,
				"windowlocationorigin"
			);

		const responseHeaders = new Headers(targetedResponse.headers);
		responseHeaders.set('Access-Control-Allow-Origin', '*');
		responseHeaders.set('Access-Control-Allow-Headers', '*');

		// 나머지 리소스는 그대로 전달
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
			? await request.body
			: undefined,
		});

		const responseHeaders = new Headers(targetedResponse.headers);
		responseHeaders.set('Access-Control-Allow-Origin', '*');
		responseHeaders.set('Access-Control-Allow-Headers', '*');

		// 나머지 리소스는 그대로 전달
		return new Response(targetedResponse.body, {
			status: targetedResponse.status,
			headers: responseHeaders,
		});
	},

	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {

		// ROOT인 경우
		const url = new URL(request.url);
		// 
		console.log('FETCH >> ' + url)

		// 
		if(request.method === "OPTIONS") {
			return this.fetchOptions(request);
  		}

		// ROOT인 경우, 타겟 페이지로 프록시 하기
		else if(url.pathname == '/') {
	    // 	return Response.redirect(request.url + hostId, 302);
		// }

		// else if(url.pathname == "/" + hostId) {
			return this.fetchHost(request);
		}

		else if(url.pathname.startsWith("/api")) {
			return this.fetchApi(request);
		}

		else if(url.pathname.endsWith(".js")) {
			return this.fetchScript(request);
		}

		else if(url.pathname == '/raw') {
	    	return Response.redirect("/raw.html", 302);
		}	

		else {
			return this.fetchElse(request);
		}
	}
};

