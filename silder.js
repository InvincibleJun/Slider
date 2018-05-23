!(function(window) {
  var w = window,
    d = document

  var defaultStyle = {
    container: {
      position: 'relative',
      width: '100%',
      overflow: 'hidden'
    },

    wrapper: {
      display: 'flex',
      width: '400%',
      margin: 0,
      padding: 0
    },

    imgs: {
      listStyle: 'none',
      flex: 1,
      height: 200,
      backgroundSize: 'cover'
    },

    banner: {
      backgroundColor: 'rgb(0, 0, 0, .5)',
      width: '100%',
      height: 20,
      position: 'absolute',
      bottom: 0,
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      height: 20,
      flexWrap: 'nowrap',
      margin: 0,
      padding: 0
    },

    tab: {
      listStyle: 'none',
      width: 10,
      backgroundColor: '#fff',
      borderRadius: 5,
      margin: 5
    },

    active: {
      width: 20
    }
  }

  var checkIsLength = (function() {
    var map = ['width', 'height', 'margin', 'padding', 'border-radius']
    return function(name) {
      return map.indexOf(name) !== -1
    }
  })()

  var changHump = function(str) {
    return str.replace(/[A-Z]/, function(word) {
      return '-' + word.toLowerCase()
    })
  }

  /**
   * 移动端轮播器
   * @param {any} option 配置
   * @param {string || HTMLelement} option.container required 容器
   * @param {Array<string>} option.source 底部容器选择器
   * @param {int} option.timeout default{5000} 播放间隔时间/ms
   * @param {boolean} option.autopaly default{true} 是否自动播放
   * @param {boolean} option.showbanner default{true} 是否展示tabs
   * @param {boolean} option.canTouch default{true} 是否可触摸滚动
   */
  function Slider(option) {
    this.autopaly = option.autopaly || true
    this.canTouch = option.canTouch || true
    this.timeout = option.timeout || 5000
    this.showbanner = option.showbanner || true
    this.source = option.source
    this.container = option.container
    this.init()
  }

  Slider.prototype = {
    /**
     * 初始化函数
     */
    init: function() {
      var self = this

      /* @type int 唯一id */
      this.uuid = Math.ceil(Math.random() * 10000)

      /* @type HTMLelement 容器 */
      this.containerEle = d.querySelector(this.container)

      // 添加style
      var styleStr = this.styleMerge()
      var styleElement = d.createElement('style')
      styleElement.innerHTML = styleStr
      d.head.appendChild(styleElement)

      // 获得html片段和内部dom元素
      var fragmentAndDoms = this.render()

      /* @type HTMLElement 图片父容器 */
      this.wrapperEle = fragmentAndDoms.wrapper

      /* @type Array<HTMLElement> 图片集合 */
      this.childs = fragmentAndDoms.childs

      // 添加至文档中
      this.containerEle.appendChild(fragmentAndDoms.fragment)
      this.containerEle.classList.add('container-' + this.uuid)

      /* @type int 单图宽度 */
      this.childWidth = this.containerEle.offsetWidth

      /* @type int margin值，动画中不做改变 */
      this.left = -this.childWidth

      /* @type int 图片个数 */
      this.l = this.childs.length

      this.moving = false

      this.index = 0
      // 布局调整
      this.configurationWrapper()

      this.requestAnimationFrameInit()

      if (this.showbanner) {
        /* @type Array<HTMLElement> tabs集合 */
        this.tabs = fragmentAndDoms.tabs
        for (var i = 0, l = this.tabs.length; i < l; i++) {
          ;(function(i) {
            self.addEvent(self.tabs[i], 'click', function(e) {
              self.clickTab(i)
            })
          })(i)
        }
      }

      if (this.canTouch) {
        this.touch()
      }

      if (this.autopaly) {
        this.start()
      }
    },

    /**
     * 渲染函数
     */
    render: function() {
      var fragment = d.createDocumentFragment(),
        wrapper = d.createElement('ul'),
        banner = d.createElement('ul'),
        childs = [],
        tabs = []

      wrapper.className = 'wrapper-' + this.uuid
      banner.className = 'banner-' + this.uuid

      for (var i = 0, l = this.source.length; i < l; i++) {
        var img = d.createElement('li')
        img.className = 'imgs-' + this.uuid
        img.style.backgroundImage = 'url(' + this.source[i] + ')'
        wrapper.appendChild(img)
        childs.push(img)

        if (this.showbanner) {
          var tab = d.createElement('li')
          tab.className = 'tab-' + this.uuid
          i === 0 && tab.classList.add('active-' + this.uuid)
          banner.appendChild(tab)
          tabs.push(tab)
          banner.className = 'banner-' + this.uuid
        }
      }

      fragment.appendChild(wrapper)
      fragment.appendChild(banner)

      return {
        fragment: fragment,
        wrapper: wrapper,
        banner: banner,
        childs: childs,
        tabs: tabs
      }
    },

    /**
     * style合并
     */
    styleMerge: function() {
      var styled = Object.assign(defaultStyle, this.customerStyle)

      var styleStr = ''
      for (var name in defaultStyle) {
        var val = defaultStyle[name]
        styleStr += '.' + name + '-' + this.uuid + '{'
        for (var style in val) {
          var v = val[style]
          var style = changHump(style)
          v = typeof v === 'number' && checkIsLength(style) ? v + 'px' : v
          styleStr += style + ':' + v + ';'
        }
        styleStr += '}'
      }

      return styleStr
    },

    /**
     * 兼容性处理
     */
    requestAnimationFrameInit: function() {
      w.requestAnimationFrame = (function() {
        return (
          // 私有
          w.requestAnimationFrame ||
          w.webkitRequestAnimationFrame ||
          w.mozRequestAnimationFrame ||
          w.oRequestAnimationFrame ||
          w.msRequestAnimationFrame ||
          // ie
          function(callback) {
            w.setTimeout(callback, 1000 / 60)
          }
        )
      })()
    },

    touch: function() {
      var self = this,
        /* @type [float] 初始触摸位置 */
        start = 0,
        /* @type [float] 初始触摸的距离 */
        l = 0,
        /* @type [float] 实时拖动left值 */
        nowLeft = 0

      this.addEvent(this.wrapperEle, 'touchstart', function(e) {
        // 正在滑动，则禁止操作
        if (self.moving) return
        self.stop()
        start = e.touches[0].clientX
      })

      this.addEvent(this.wrapperEle, 'touchmove', function(e) {
        if (self.moving) return
        // 触摸距离
        l = start - e.touches[0].clientX
        nowLeft = self.left - l
        self.setLeft(nowLeft)
      })

      this.addEvent(this.wrapperEle, 'touchend', function(e) {
        if (self.moving) return
        /* @type [boolean] true向右拖动,fasle向左拖动  */
        var direction = !(l > 0)
        // 是否大于1/2, 否则则回滚原始位置
        if (Math.abs(l) > self.childWidth / 2) {
          self.scroll(
            nowLeft,
            self.left - (direction ? -self.childWidth : +self.childWidth),
            20,
            function() {
              self.start()
            }
          )
        } else {
          self.scroll(nowLeft, self.left, 20, function() {
            self.start()
          })
        }
      })
    },

    /**
     * 设置wrapper内位置
     */
    setLeft: function(left) {
      this.wrapperEle.style.marginLeft = left + 'px'
    },

    /**
     * 无限滚动首位适配
     */
    configurationWrapper: function(index) {
      /* @type HTMLElement 首个图片 */
      var first = this.childs[0].cloneNode(true)

      /* @type HTMLElement 末尾图片 */

      var last = this.childs[this.l - 1].cloneNode(true)
      // 添加
      this.wrapperEle.appendChild(first)
      this.wrapperEle.insertBefore(last, this.childs[0])
      // flex布局适配
      this.wrapperEle.style.marginLeft = this.left + 'px'
      this.wrapperEle.style.width = (this.l + 2) * 100 + '%'
    },

    /**
     * 元素查询
     * @param [string] selector 选择元素
     * @param [boolean] isMany 多数选择
     * @param [HTMLElement] root 根元素
     * @return [HTMLElement] 被选中元素
     */
    find: function(selector, isMany, root) {
      // isMany不存在时
      if (typeof isMany === 'string') {
        root = isMany
        isMany = false
      }
      return (root || d)[isMany ? 'querySelectorAll' : 'querySelector'](
        selector
      )
    },

    /**
     * 事件处理
     * @param [string] event 事件名
     * @param [function] cb 触发函数
     * @param [boolean] isOnce 是否单次触发
     * @return [function] 解绑函数
     */
    addEvent: function(el, event, cb, isOnce) {
      // 保留函数
      var remove
      el.addEventListener(
        event,
        (remove = function(e) {
          e.preventDefault()
          cb(e)
          isOnce && el.removeEventListener(event, remove)
        })
      )
      return function() {
        el.removeEventListener(event, remove)
      }
    },

    /**
     * 计时器函数，配置起始位置
     */
    start: function() {
      var self = this
      self.timer = setInterval(function() {
        /* @type int 初始位置 */
        var start = this.left,
          /* @type int 终点位置 */
          end = this.left - this.childWidth

        self.moving = true
        self.scroll(start, end)
      }, self.timeout)
    },

    /**
     * 滑动函数
     * @param [number] start 初始值
     * @param [end] end 中止值
     * @param [function] cb 回调函数
     */
    scroll: function(start, end, l, cb) {
      var self = this,
        /* @type [boolean] true递增方向, false递减方向 */
        direction = !(start > end),
        count = start,
        cb = cb || function() {},
        /* @type int 每帧距离 */
        l = l || 20

      function animate() {
        count += direction ? l : -l

        if (direction ? count >= end : count <= end) {
          self.setLeft(end)
          self.left = end
          self.scrollEnd()
          return cb()
        }

        self.setLeft(count)
        w.requestAnimationFrame(animate)
      }
      animate()
    },

    /**
     * 滑动结束处理：滚动替换和banner刷新
     */
    scrollEnd: function() {
      var self = this
      self.moving = false
      // 获得下标值
      self.index = -self.left / self.childWidth - 1
      // console.log(index)
      // 首个替换位, 表示已从首个滑动至末尾
      if (self.index === -1) {
        // wrapper元素left替换为末尾left
        self.setLeft((self.left = -self.childWidth * self.l))
        // index重置为末尾
        self.index = self.l - 1
        // 末尾替换位, 表示已从末尾滑动至首个
      } else if (self.index === self.l) {
        // wrapper元素left替换为原始位置
        self.setLeft((self.left = -self.childWidth))
        // 下标置为0
        self.index = 0
      }

      // 刷新tab
      if (self.showbanner) {
        self.changeTab()
      }
    },

    /**
     * 为当前tab增加active类
     */
    changeTab: function() {
      for (var i = 0, l = this.tabs.length; i < l; i++) {
        this.tabs[i].classList.remove('active-' + this.uuid)
        i === this.index && this.tabs[i].classList.add('active-' + this.uuid)
      }
    },

    /**
     * tab点击切换
     */
    clickTab: function(tabIndex) {
      var self = this
      // 禁止重复点击
      if (this.moving || tabIndex === this.init) return
      this.stop()
      // 初始位置
      var start = -(this.index + 1) * this.childWidth
      // 末位置
      var end = -(tabIndex + 1) * this.childWidth
      this.scroll(start, end, 80, function() {
        self.start()
      })
    },

    /**
     * 停止计时动画
     */
    stop: function() {
      clearInterval(this.timer)
    },

    /**
     * 错误处理
     */
    errorStack: function(msg) {
      throw new Error(msg)
    }
  }

  window.Slider = Slider
})(window)
