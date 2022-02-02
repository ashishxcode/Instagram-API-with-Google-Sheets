const axios = require('axios');
const { google } = require('googleapis');
const keys = require('./keys.json');

const client = new google.auth.JWT(keys.client_email, null, keys.private_key, [
	'https://www.googleapis.com/auth/spreadsheets',
]);

client.authorize((err, tokens) => {
	if (err) {
		console.log(err);
		return;
	} else {
		console.log('Conneting with Sheets!');
		gsrun(client);
	}
});

const getProfile = async (url) => {
	const res = await axios.get(url);
	profile = res.data.graphql.user;
	return profile;
};

const getFollowers = async (url) => {
	const res = await axios.get(url);
	const followers = res.data.graphql.user.edge_followed_by.count;
	return followers;
};

const getFollowings = async (url) => {
	const res = await axios.get(url);
	const followings = res.data.graphql.user.edge_follow.count;
	return followings;
};

const getPosts = async (url) => {
	const res = await axios.get(url);
	const posts = res.data.graphql.user.edge_owner_to_timeline_media.edges;

	const postsArray = posts.slice(0, 10);

	const postDetails = await Promise.all(
		postsArray.map(async (post) => {
			const postData = {
				id: post.node.id,
				post_url: `https://www.instagram.com/p/${post.node.shortcode}/`,
				likes: post.node.edge_liked_by.count,
				comments: post.node.edge_media_to_comment.count,
				media_type: post.node.__typename,
				media_url: post.node.display_url,
			};
			return postData;
		})
	);
	return postDetails;
};

const getEngagementRatio = async (url) => {
	const posts = await getPosts(url);
	const followers = await getFollowers(url);
	let totalComments = 0;
	let totalLikes = 0;

	for (let i = 0; i < 10; i++) {
		totalComments += posts[i].comments;
		totalLikes += posts[i].likes;
	}

	const engagementRatio = (
		((totalLikes + totalComments) / followers / 10) *
		100
	).toFixed(3);

	return engagementRatio;
};

const getLikesCount = async (url) => {
	const posts = await getPosts(url);
	let totalLikes = 0;

	for (let i = 0; i < posts.length; i++) {
		totalLikes += posts[i].likes;
	}

	return totalLikes;
};

const getCommentCount = async (url) => {
	const posts = await getPosts(url);
	let totalComments = 0;

	for (let i = 0; i < posts.length; i++) {
		totalComments += posts[i].comments;
	}

	return totalComments;
};
async function gsrun(cl) {
	const gsapi = google.sheets({ version: 'v4', auth: cl });

	const username = 'alluarjunonline';

	const showProfile = async () => {
		const url = `https://www.instagram.com/${username}/?__a=1`;
		const followers = await getFollowers(url);
		const followings = await getFollowings(url);
		const profile = await getProfile(url);
		const posts = await getPosts(url);
		const likes = await getLikesCount(url);
		const comments = await getCommentCount(url);
		const engagementRatio = await getEngagementRatio(url);

		const defaultParams = [
			[
				'Username',
				'Followers',
				'Follwoings',
				'Posts',
				'Likes',
				'Comments',
				'Engagement Ratio',
			],
		];

		const userName = profile.username;
		const followersCount = followers;
		const followingsCount = followings;
		const postsCount = posts.length;
		const likesCount = likes;
		const commentsCount = comments;
		const engagementRatioCount = engagementRatio;

		const params = [
			...defaultParams,
			[
				userName,
				followersCount,
				followingsCount,
				postsCount,
				likesCount,
				commentsCount,
				engagementRatioCount,
			],
		];

		const writeOptions = {
			spreadsheetId: '1kYIK2aqW18gm9mYEKdBBxeys0icvKSNFTE2G-51VZ98',
			range: 'Sheet1!A1',
			valueInputOption: 'USER_ENTERED',
			resource: {
				values: params,
			},
		};
		const res = await gsapi.spreadsheets.values.update(writeOptions);

		res && console.log(res.data);
	};

	try {
		const res = await showProfile();
		console.log(res);
	} catch (err) {
		console.log(err);
	}
}
