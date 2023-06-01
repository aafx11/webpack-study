# Babel 基本原理与作用
babel 主要用于将新版本的代码转换为向后兼容的 js 语法

## Babel 的流程
首先将源码转成抽象语法树，然后对语法树进行处理生成新的语法树，最后将新语法树生成新的 JS 代码

### Babel 的流程
3 个阶段： parsing (解析)、transforming (转换)、generating (生成)
1）通过babylon将 js 转化成 ast (抽象语法树)
2）通过babel-traverse是一个对 ast 进行遍历，使用 babel 插件转化成新的 ast
3）通过babel-generator将 ast 生成新的 js 代码

### 配置
主要是配置presets 和 plugins
```js
.babelrc {
  // 预设: Babel 官方做了一些预设的插件集，称之为 Preset，我们只需要使用对应的 Preset 就可以了
  "presets": [],
   // babel和webpack类似，主要是通过plugin插件进行代码转化的，如果不配置插件，babel会将代码原样返回
  "plugins": []
}
```

### 配置browserslist
browserslist 用来控制要兼容浏览器版本，配置的范围越具体，就可以更精确控制Polyfill转化后的体积大小

```js
"browserslist": [
   // 全球超过1%人使用的浏览器
   "> 1%",
   //  所有浏览器兼容到最后两个版本根据CanIUse.com追踪的版本
   "last 2 versions",
   // chrome 版本大于70
   "chrome >= 70"
   // 排除部分版本
   "not ie <= 8"
]
```

### 一个最简单的插件: 将const a 转化为const b
1）一个函数，参数是 babel，然后就是返回一个对象，key是visitor，然后里面的对象是一个箭头函数
2）函数有两个参数，path表示路径，state表示状态
3）CallExpression就是我们要访问的节点，path 参数表示当前节点的位置，包含的主要是当前节点（node）内容以及父节点（parent）内容

```js
module.exports = function (babel) {
  let t = babel.types;
  return {
    visitor: {
      VariableDeclarator(path, state) {
        // VariableDeclarator 是要找的变量声明
        if (path.node.id.name == 'a') {
          // 方式一：直接修改name
          path.node.id.name = 'b';
          // 方式二：把id是a的ast换成b的ast
          // path.node.id = t.Identifier("b");
        }
      }
    }
  };
}; 
```