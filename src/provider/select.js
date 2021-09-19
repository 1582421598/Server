const similarity = require('../similarity')

const ENABLE_WEIGHTINGSYSTEM = (process.env.ENABLE_WEIGHTINGSYSTEM || '').toLowerCase() === 'true'

const replaceSpace = (string) => string.replace(/&nbsp;/g, ' ').replace(/nbsp;/g, ' ')

const calcWeight = (song, info) => {
	var weight = 0
	const songName = replaceSpace(song.name.replace(/（\s*cover[:：\s][^）]+）/i, '')
		.replace(/\(\s*cover[:：\s][^\)]+\)/i, '')
		.replace(/（\s*翻自[:：\s][^）]+）/, '')
		.replace(/\(\s*翻自[:：\s][^\)]+\)/, '')).toLowerCase()
	const similarityVaule = similarity.compareTwoStrings(songName, info.name)
	if (similarityVaule === 0) return 0 //歌曲名不相似绝对不一样    
	if (similarityVaule === 1) weight = 0.15
	else weight = similarityVaule / 4

	if (song.artists) {
		var authorName = ''
		if (Array.isArray(song.artists)) {
			song.artists.forEach(artists => {
				authorName = authorName + artists.name.replace(/&nbsp;/g, ' ')
			});
		} else {
			authorName = song.artists.name
		}
		authorName = replaceSpace(authorName).toLowerCase()
		const songName = song.name ? song.name : ''
		info.artists.forEach(artists => {
			const originalName = artists.name.toLowerCase()
			if (authorName.includes(originalName)) weight = weight + 0.1
			else if (songName.includes(originalName)) weight = weight + 0.1
			else weight = weight - 0.1
		})
	}
	if (song.duration) {
		const songLength = Math.abs(song.duration - info.duration)
		if (songLength < 3 * 1e3) weight = weight + 0.1
		else if (songLength < 6 * 1e3) weight = weight + 0.06
		else if (songLength < 9 * 1e3) weight = weight + 0.03
	}
	return weight.toFixed(2) * 100
}

const selectList = (list, info) => {
	var result = list[0];
	var lastweighting = 0;
	var weighting = 0;
	for (let index = 0; index < list.length; index++) {
		weighting = calcWeight(list[index], info);
		if (lastweighting < weighting) {
			lastweighting = weighting
			result = list[index]
		}
		//list[index].weight = calcWeight(list[index], info)
	}
	// return selectArray(list)
	return result;
}

const selectArray = array => {
	var song = array[0]
	for (let index = 1; index < array.length; index++) {
		const nowSong = array[index];
		if (song.weight < nowSong.weight) song = nowSong
	}
	return song
}

module.exports = (list, info) => {
	if (ENABLE_WEIGHTINGSYSTEM) selectList(list, info)
	else {
		const {
			duration
		} = info;
		const song = list
			.slice(0, 5) // 挑前5个结果
			.find(
				(song) =>
				song.duration && Math.abs(song.duration - duration) < 5 * 1e3
			); // 第一个时长相差5s (5000ms) 之内的结果
		if (song) return song;
		else return list[0]; // 没有就播放第一条
	}
};

module.exports.ENABLE_FLAC = (process.env.ENABLE_FLAC || '').toLowerCase() === 'true'
