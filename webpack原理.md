## 热更新原理
主要是通过websocket实现，建立本地服务和浏览器的双向通信。当代码变化，重新编译后，通知浏览器请求更新的模块，替换原有的模块

1） 通过webpack-dev-server开启server服务，本地 server 启动之后，再去启动 websocket 服务，建立本地服务和浏览器的双向通信

2） webpack 每次编译后，会生成一个Hash值，Hash值 是每一次编译的标识。本次新生成的文件会以上一次的 Hash 值作为文件名标识

3） webpack 通过监听文件的生成时间来判断文件是否有变化，当文件变化后，重新编译

4）编译结束后，通知浏览器请求变化的资源，同时将新生成的 hash 值传给浏览器，用于下次热更新使用

5）浏览器拿到更新后的模块后，用新模块替换掉旧的模块，实现局部刷新



## Plugin 插件
webpack 的插件是依靠 webpack 的钩子函数实现的
webpack 在编译过代码程中，会触发一系列 Tapable 钩子函数，插件只需要在相应的钩子函数上注册事件，当webpack构建的时候，插件注册的事件就会随着钩子函数的触发而执行

### 插件的实现
1）Plugin 的本质是一个 node 模块，这个模块导出一个 JavaScript 类 或者 JavaScript 方法
2）它的原型上需要定义一个apply 的方法
3）通过 compiler 在钩子函数上注册事件
4）通过 compilation 操作 webpack 内部实例特定数据
5）功能完成后，执行 webpack 提供的 cb 回调

### 自定义一个名为MyPlugin插件，该插件在打包完成后，在控制台输出"打包已完成"
```javaScript
class MyPlugin {
  // 原型上需要定义apply 的方法
  apply(compiler) {
    // 通过compiler获取webpack内部的钩子
    compiler.hooks.done.tap('My Plugin', (compilation, cb) => {
      console.log('打包已完成');
      // 分为同步和异步的钩子，异步钩子必须执行对应的回调
    });
  }
}
module.exports = MyPlugin;
```

### 开发一个打包文件清单插件,将清单写入一个新的md文件中

```javaScript
class FileListPlugin {
  constructor (options) {
    // 获取插件配置项
      this.filename = options && options.filename ? options.filename : 'FILELIST.md';
  }

  apply(compiler) {
      // 注册 compiler 上的 emit 钩子
      compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, cb) => {
          
          // 通过 compilation.assets 获取文件数量
          let len = Object.keys(compilation.assets).length;

          // 添加统计信息
          let content = `# ${len} file${len>1?'s':''} emitted by webpack\n\n`;

          // 通过 compilation.assets 获取文件名列表
          for(let filename in compilation.assets) {
              content += `- ${filename}\n`;
          }

          // 往 compilation.assets 中添加清单文件
          compilation.assets[this.filename] = {
            // 写入新文件的内容
              source: function() {
                  return content;
              },
              // 新文件大小（给 webapck 输出展示用）
              size: function() {
                  return content.length;
              }
          }

          // 执行回调，让 webpack 继续执行
          cb();
      })
  }
}

module.exports = FileListPlugin;
```

 **compiler 上暴露的一些常用的钩子简介**
| 钩子         | 类型              | 调用时机                                                             |
| ------------ | ----------------- | -------------------------------------------------------------------- |
| run          | AsyncSeriesHook   | 在编译器开始读取记录前执行                                           |
| compile      | SyncHook          | 在一个新的 compilation 创建之前执行                                  |
| compilation  | SyncHook          | 在一次 compilation 创建后执行插件                                    |
| make         | AsyncParallelHook | 完成一次编译之前执行                                                 |
| emit         | AsyncSeriesHook   | 在生成文件到 output 目录之前执行，回调参数： compilation             |
| afterEmit    | AsyncSeriesHook   | 在生成文件到 output 目录之后执行                                     |
| assetEmitted | AsyncSeriesHook   | 生成文件的时候执行，提供访问产出文件信息的入口，回调参数：file，info |
| done         | AsyncSeriesHook   | 一次编译完成后执行，回调参数：stats                                  |

#### 常用的 Plugin 插件

| 插件名称                    | 作用                                                    |
| --------------------------- | ------------------------------------------------------- |
| html-webpack-plugin         | 生成 html 文件,引入公共的 js 和 css 资源                |
| webpack-bundle-analyzer     | 对打包后的文件进行分析，生成资源分析图                  |
| terser-webpack-plugin       | 代码压缩，移除 console.log 打印等                       |
| HappyPack Plugin            | 开启多线程打包，提升打包速度                            |
| Dllplugin                   | 动态链接库，将项目中依赖的三方模块抽离出来，单独打包    |
| DllReferencePlugin          | 配合 Dllplugin，通过 manifest.json 映射到相关的依赖上去 |
| clean-webpack-plugin        | 清理上一次项目生成的文件                                |
| vue-skeleton-webpack-plugin | vue 项目实现骨架屏                                      |

## loader 
loader 的本质是一个 node模块，该模块导出一个函数，函数接收source(源文件)，返回处理后的source

**一个简单的`style-loader`**

```js
// 作用：将css内容，通过style标签插入到页面中
// source为要处理的css源文件
function loader(source) {
  let style = `
    let style = document.createElement('style');
    style.setAttribute("type", "text/css");
    style.innerHTML = ${source};
    document.head.appendChild(style)`;
  return style;
}
module.exports = loader;
```

#### 常用的 loader

| 名称                    | 作用                                               |
| ----------------------- | -------------------------------------------------- |
| style-loader            | 用于将 css 编译完成的样式，挂载到页面 style 标签上 |
| css-loader              | 用于识别 .css 文件, 须配合 style-loader 共同使用   |
| sass-loader/less-loader | css 预处理器                                       |
| postcss-loader          | 用于补充 css 样式各种浏览器内核前缀                |
| url-loader              | 处理图片类型资源，可以转 base64                    |
| vue-loader              | 用于编译 .vue 文件                                 |
| worker-loader           | 通过内联 loader 的方式使用 web worker 功能         |
| style-resources-loader  | 全局引用对应的 css，避免页面再分别引入             |


## Webpack5 Module Federation模块联邦
可以实现项目与项目之间共享依赖，比如A和B项目同时引用C项目的组件，一般的做法就是C项目组件发不到npm
A和B项目引入C组件，但是这样C组件一旦更新，就需要重新发布npm，A和B项目也需要重新安装npm包
使用模块联邦后，将 C 组件模块暴露出去，项目 A 和项目 B 就可以远程进行依赖引用。当 C 组件发生变化后，A 和 B 无需重新引用

适合于多个团队一起开发一个或多个应用程序

```js
new ModuleFederationPlugin({
     name: "app_1",
     library: { type: "var", name: "app_1" },
     filename: "remoteEntry.js",
     remotes: {
        app_02: 'app_02',
        app_03: 'app_03',
     },
     exposes: {
        antd: './src/antd',
        button: './src/button',
     },
     shared: ['react', 'react-dom'],
}),
```

### 重要参数说明
1）name  当前应用名称，需要全局唯一
2）remotes  可以将其他项目的  name  映射到当前项目中
3）exposes  表示导出的模块，只有在此申明的模块才可以作为远程依赖被使用
4）shared  是非常重要的参数，制定了这个参数，可以让远程加载的模块对应依赖，改为使用本地项目的依赖，如 React 或 ReactDOM

