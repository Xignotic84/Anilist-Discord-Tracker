module.exports = {
  /**
   *
   * @param username
   * @returns string
   */
  getUserIDFromUsername: (username) => `query {
     User(name: "${username}") {
          id
        }
    }`,

  /**
   * Get user watch history from AniList
   * @param userID
   * @returns string
   */
  getUserWatchHistory: (userID) => `query {
      Page(page: 1, perPage: 25) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        activities(userId: ${userID}, sort:ID_DESC) {
          ... on ListActivity {
            id user { id name avatar { large } options { profileColor } } status type progress
            media { id coverImage {
              large
            } title { romaji english native userPreferred } type episodes chapters }
            createdAt isLocked isSubscribed isLiked replies { id text likeCount } likes { id name }
          }
        }
      }
    }`
}
