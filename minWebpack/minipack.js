const fs = require('fs');
const path = require('path');
/**
 * babylon解析js语法，生产AST 语法树
 * ast将js代码转化为一种JSON数据结构
 */
const babylon = require('babylon');
// babel-traverse是一个对ast进行遍历的工具, 对ast进行替换
const traverse = require('babel-traverse').default;
// 将es6 es7 等高级的语法转化为es5的语法
const { transformFromAst } = require('babel-core');

/**
 * 
 * 1.初始化打包参数                        Webpack 通过解析配置文件和Shell语句,获取到最终打包的参数
 * 
 * 2.开始编译前                            加载所有配置的插件，根据打包的参数初始化 Compiler 对象，执行对象的 run 方法开始执行编译
 * 
 * 3.读取入口文件（构建依赖图谱）           Webpack 从项目的entry入口文件开始递归分析，先是调用所配置的 loader 将模块编译成js，
 *                                       然后用 Parser 插件将js 转换成ast语法树，从配置的入口模块开始，通过 babel-traverse 遍历 AST 语法树，
 *                                       当代码中遇到require或者import 这些导入语句，就将这些引入的模块加入到依赖模块列表，
 *                                       同时对新找出的依赖模块继续进行递归分析，最终生成依赖图谱，在这个递归分析过程中，
 *                                       Webpack 会将路径加上文件名作为唯一标识，防止重复编译 
 * 
 * 4.转换代码                              Webpack 会根据配置的插件，对代码进行压缩、合并、优化这些操作（terser-webpack-plugin 压缩代码，webpack-bundle-analyzer打包资源图）
 * 
 * 5.输出代码                              最后根据依赖关系开始生成包含多个模块的 Chunk ，并输出到 output 目录 
 * 
 */

/**
 * Compiler 负责文件监听和启动编译。Compiler 实例中包含了完整的 Webpack 配置，全局只有一个 Compiler 实例。
 */


/**
 * 
 * **compiler 上暴露的一些常用的钩子简介**
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
 */

/* 
  1.从入口文件开始解析,生成文件对应的 ast 抽象语法树
  2.遍历 ast 语法树，通过查找import的文件，找到该文件的依赖关系，生成依赖关系图谱
  3.同时将 ES6 语法转化成 ES5
  4.最终生成一个可以在浏览器加载执行的 js 文件
 */

// 每一个js文件，对应一个id
let ID = 0;

/**
 * filename参数为文件路径, 读取内容并提取它的依赖关系
 * 1.读取文件
 * 2.转换成 ast 抽象语法树
 * 3.遍历 ast 语法树，找到找到该文件的依赖关系
 * 4.转换代码，将es6 es7 等高级的语法转化为es5的语法
 */
function createAsset (filename) {
  console.log('执行了createAsset');
  // 读取文件
  const content = fs.readFileSync(filename, 'utf-8');

  // 获取该文件对应的ast 抽象语法树
  const ast = babylon.parse(content, {
    sourceType: 'module'
  });

  // dependencies保存所依赖的模块的相对路径
  const dependencies = [];

  // 通过查找import节点，找到该文件的依赖关系
  // 因为项目中我们都是通过 import 引入其他文件的，找到了import节点，就找到这个文件引用了哪些文件
  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      // 遍历所有的 import 模块，并将相对路径放入 dependencies
      // 查找import节点，node.source.value 为引入文件的相对路径 
      dependencies.push(node.source.value);
    }
  });

  // 通过递增计数器，为此模块分配唯一标识符, 用于缓存已解析过的文件
  const id = ID++;

  /**
   * 把 AST 转成浏览器可运行的代码
   * 将es6 es7 等高级的语法转化为es5的语法
   * 该`presets`选项是一组规则，告诉`babel`如何传输我们的代码. 
   * 用`babel-preset-env`将代码转换为浏览器可以运行的东西.
   */
  const { code } = transformFromAst(ast, null, {
    // 用`babel-preset-env``将我们的代码转换为浏览器可以运行的东西
    presets: ['env']
  });

  // 返回此模块的相关信息
  return {
    id, // 文件id（唯一）
    filename, // 文件路径
    dependencies, // 文件的依赖关系
    code // 文件的代码
  };
}

/**
 * 提取它的每一个依赖文件的依赖关系，循环下去：找到对应这个项目的`依赖图`
 * 返回依赖图的数组
 */
function createGraph (entry) {
  // 得到入口文件的依赖关系,这里只获得了入口文件对应的依赖关系
  const mainAsset = createAsset(entry);
  const queue = [mainAsset];
  for (const asset of queue) {
    asset.mapping = {};
    // 获取这个模块所在的目录
    const dirname = path.dirname(asset.filename);
    asset.dependencies.forEach((relativePath) => {

      // 通过将相对路径与父资源目录的路径连接,将相对路径转变为绝对路径
      // 每个文件的绝对路径是固定、唯一的(父资源目录+dependencies中的相对路径组成绝对路径)
      const absolutePath = path.join(dirname, relativePath);
      // 递归解析其中所引入的其他资源
      const child = createAsset(absolutePath);
      asset.mapping[relativePath] = child.id;
      // 将`child`推入队列, 通过递归实现了这样它的依赖关系解析
      queue.push(child);
    });
  }

  // queue这就是最终的依赖关系图谱
  return queue;
}

// 自定义实现了require 方法，找到导出变量的引用逻辑
function bundle (graph) {
  let modules = '';
  graph.forEach((mod) => {
    modules += `${mod.id}: [
      function (require, module, exports) { ${mod.code} },
      ${JSON.stringify(mod.mapping)},
    ],`;
  });
  const result = `
    (function(modules) {
      function require(id) {
        const [fn, mapping] = modules[id];
        function localRequire(name) {
          return require(mapping[name]);
        }
        const module = { exports : {} };
        fn(localRequire, module, module.exports);
        return module.exports;
      }
      require(0);
    })({${modules}})
  `;
  return result;
}

const graph = createGraph('./example/entry.js');
const result = bundle(graph);

// 创建dist目录，将打包的内容写入main.js中
fs.mkdir('dist', (err) => {
  console.log('err', err);
  if (!err)
    fs.writeFile('dist/main.js', result, (err1) => {
      if (!err1) console.log('打包成功');
    });
});