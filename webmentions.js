const https = require("https");
const fs = require("fs")
// Transform webmention slashes with --
fetchWebmentions().then(webmentions => {
	webmentions.forEach(webmention => {
		const slug = webmention["wm-target"]
			.replace("https://www.aferrero.boo/", "")
			.replace(/\/$/, "")
			.replace("/", "--");

		const filename = `${__dirname}/_data/webmentions/${slug}.json`;

		// if file doesn't exist; create it
		if (!fs.existsSync(filename)) {
			fs.writeFileSync(filename, JSON.stringify([webmention], null, 2));
			return;
		}

		// If the file already exists we need to append new webmentions and make sure we didn't add duplicates
		const entries = JSON.parse(fs.readFileSync(filename)).filter(wm => wm["wm-id"] !== webmention["wm-id"]).concat([webmention]);

		// Sort to make sure the file is always the same
		entries.sort((a, b) => a["wm-id"] - b["wm-id"]);

		// And write the modified file
		fs.writeFileSync(filename, JSON.stringify(entries, null, 2));
	});
});

function fetchWebmentions() {
	// Catch webmention.io token from GH secret
	const token = process.env.WEBMENTIONS_TOKEN;

	// Gather webmentions from the past 3 days
	const since = new Date();
	since.setDate(since.getDate() - 60)

	const url = `https://webmention.io/api/mentions.jf2?domain=www.aferrero.boo&token=${token}&since=${since.toISOString()}&per-page=999`

	return new Promise((resolve, reject) => {
		https.get(url, res => {
			let body = "";
			res.on("data", chunk => {
				body += chunk;
			});

			res.on("end", () => {
				try {
					resolve(JSON.parse(body));
				} catch (error) {
					reject(error);
				}
			});
		}).on("error", error => {
			reject(error);
		});
	}).then(response => {
		if (!("children" in response)) {
			throw new Error("Invalid webmention.io response.");
		}

		return response.children;
	});
}
