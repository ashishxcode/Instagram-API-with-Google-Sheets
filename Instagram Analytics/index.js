const { default: axios } = require('axios');
const { google } = require('googleapis');
const keys = require('./keys.json');

const client = new google.auth.JWT(keys.client_email, null, keys.private_key, [
	'https://www.googleapis.com/auth/spreadsheets',
]);

const url = `https://graph.facebook.com/v12.0/17841426725234970/media?access_token=${keys.facebook_token}`;

let postAnalytics;

client.authorize((err, tokens) => {
	if (err) {
		console.log(err);
		return;
	} else {
		console.log('Connected!');
		gsrun(client);
	}
});

const getPosts = () => {
	try {
		return axios.get(url);
	} catch (error) {
		console.log(error);
	}
};

const getPostDetails = async (post) => {
	try {
		let Data = {};
		await axios
			.all([
				axios.get(
					`https://graph.facebook.com/v12.0/${post.id}?fields=like_count,media_url,comments_count,caption,permalink,media_type&access_token=${keys.facebook_token}`
				),
				axios.get(
					`https://graph.facebook.com/v12.0/${post.id}/insights?metric=engagement,impressions,reach&access_token=${keys.facebook_token}`
				),
			])
			.then(
				axios.spread((res1, res2) => {
					Data = res1.data;
					Data['engagement'] = res2.data.data[0].values[0].value;
					Data['impressions'] = res2.data['data'][1]['values'][0]['value'];
					Data['reach'] = res2.data['data'][2]['values'][0]['value'];
				})
			)
			.catch((err) => {
				console.log(err);
			});
		return Data;
	} catch (error) {
		console.log(error);
	}
};

async function gsrun(cl) {
	const gsapi = google.sheets({ version: 'v4', auth: cl });

	const getData = async () => {
		const posts = await getPosts();
		const postsData = posts.data.data;
		const postsList = postsData
			.slice(0, 10)
			.map((post) => getPostDetails(post));
		postAnalytics = await Promise.all(postsList);

		const defaultParams = [
			[
				'ID',
				'URL',
				'Likes',
				'Comments',
				'Engagement',
				'Impressions',
				'Reach',
				'Type',
				'Media URL',
				'Caption',
			],
		];

		let convertedArray = postAnalytics.map((item) => {
			return [
				item.id,
				item.permalink,
				item.like_count,
				item.comments_count,
				item.engagement,
				item.impressions,
				item.reach,
				item.media_type,
				item.media_url,
				// item.caption,
			];
		});

		const params = [...defaultParams, ...convertedArray];

		const writeOptions = {
			spreadsheetId: '1kSEoUIoBITEYF2osUgIJfahgWVPMUJhrQlTXGMCJAr4',
			range: 'Sheet1!A1',
			valueInputOption: 'USER_ENTERED',
			resource: {
				values: params,
			},
		};
		const res = await gsapi.spreadsheets.values.update(writeOptions);

		console.log(res.data);
	};
	getData();
}
