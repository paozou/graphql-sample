const { GraphQLScalarType} = require('graphql')
const fetch = require('node-fetch')

let _id = 0

let users = [
  {"githubLogin": "mHattrup", "name": "Mike Hattrup"},
  {"githubLogin": "gPlake", "name": "Glen Plake"},
  {"githubLogin": "sSchmidt", "name": "Scot Schmidt"},
]

let photos = [
  {
    "id": "1",
    "name": "Dropping the Heart Chute",
    "description": "The heart chute is one of my favorite chutes",
    "category": "ACTION",
    "githubUser": "gPlake",
    "created": "3-28-1977"
  },
  {
    "id": "2",
    "name": "Enjoying the sunshine",
    "category": "SELFIE",
    "githubUser": "sSchmidt",
    "created": "1-2-1985"
  },
  {
    "id": "3",
    "name": "Gunbarrel 25",
    "category": "LANDSCAPE",
    "githubUser": "sSchmidt",
    "created": "2018-04-15T19:09:57.308Z"
  }
]

let tags = [
  { "photoID": "1", "userID": "gPlake" },
  { "photoID": "2", "userID": "sSchmidt" },
  { "photoID": "2", "userID": "mHattrup" },
  { "photoID": "2", "userID": "gPlake" },
]

// Queryの作成時はスキーマと同名のリゾルバーを定義する
const resolvers = {
  Query: {
    totalPhotos: () => photos.length,
    allPhotos: () => photos
  },
  Mutation: {
    // postPhotoリゾルバの親(= parent)はMutationのこと(常にリゾルバの第1引数になる)
    postPhoto(parent, args) {

      let newPhoto = {
        id: _id++,
        ...args.input,
        created: new Date()
      }
      photos.push(newPhoto)
      return newPhoto
    },

    async githubAuth(parent, { code }, { db }) {
      let {
        message,
        access_token,
        avatar_url,
        login,
        name
      } = await authorizeWithGithub({
        client_id: 'db26d3ff738de02cf7d6',
        client_secret: 'b7b8418a25679c65ba1a2613ef23f19b8144962c',
        code
      })
    
      if (message) {
        throw new Error(message)
      }
    
      let latestUserInfo = {
        name,
        githubLogin: login,
        githubToken: access_token,
        avatar: avatar_url
      }
    
      const { ops:[user] } = await db.collection('users').replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true })
    
      return { user, token: access_token }
    }
  },
  // ルートに追加されたリゾルバをトリビアルリゾルバと呼ぶ
  Photo: {
    url: parent => `http://yoursite.com/img/${parent.id}.jpg`,
    postedBy: parent => {
      return users.find(u => u.githubLogin === parent.githubUser)
    },
    taggedUsers: parent => tags
    .filter(tag => tag.photoID === parent.id)
    .map(tag => tag.userID)
    .map(userID => users.find(u => u.githubLogin === userID))
  },

  User: {
    // parentは取得した情報(取得したUser)
    postedPhotos: parent => {
      return photos.filter(p => p.githubUser === parent.githubLogin)
    },
    inPhotos: parent => tags
    .filter(tag => tag.userID === parent.id)
    .map(tag => tag.photoID)
    .map(photoID => photos.find(p => p.id === photoID))
  },

  // カスタムスカラー用のリゾルバー定義
  // 新しいスカラーを作成する場合はparseValue, serialize, parseLiteralを作成する必要がある
  DateTime: new GraphQLScalarType({
    name: `DateTime`,
    description: `A valid date time value`,
    // 問合せ引数がリゾルバに渡る前にDateオブジェクトにparseする
    parseValue: value => new Date(value),
    // Queryする際にISO日時フォーマットの文字列が返却するようにする
    serialize: value => new Date(value).toISOString(),
    // Queryに直接日付を追加する場合に日付をparseする
    parseLiteral: ast => ast.value
  }),
}

async function authorizeWithGithub(credentials) {
  const { access_token } = await requestGithubToken(credentials)
  const githubUser = await requestGithubUserAccount(access_token)
  return { ...githubUser, access_token }
}

const requestGithubToken = credentials =>
  fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(credentials)
    }
  )
  .then(res => res.json())
  .catch(error => {
    throw new Error(JSON.stringify(error))
  })

const requestGithubUserAccount = token =>
  fetch(`https://api.github.com/user?access_token=${token}`)
    .then(response => response.json())
    .catch(error => console.log(error))

module.exports = resolvers
