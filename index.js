const { ApolloServer } = require('apollo-server-express')
const express = require('express')
const expressPlayground = require('graphql-playground-middleware-express').default
const { readFileSync } = require('fs')

// 文字列でスキーマを定義する
// リゾルバーが返却する型を記述する
// GraphQL APIのルート型は Query, Mutation, Subscriptionに分けられる
const typeDefs = readFileSync('./typeDefs.graphql', 'utf-8')
const resolvers = require('./resolvers')

// express()を呼び出してExpressアプリケーションを作成する
let app = express()

// サーバーのインスタンスを作成
// スキーマとリゾルバを引数に取る
const server = new ApolloServer({typeDefs, resolvers})

// applyMiddleware()を呼び出したExpressにミドルウェアを追加する
// Expressミドルウェアをサーバーに組み込む
server.applyMiddleware({app})

// ミドルウェアでカスタムルートを設定する
app.get('/', (req, res) => res.end('Welcome to the PhotoShare API'))
app.get('/playground', expressPlayground({ endpoint: '/graphql' }))

app.listen({port: 4000}, () => {
  console.log(`GraphQL Server runnnint @ http://localhost:4000${server.graphqlPath}`)
})
