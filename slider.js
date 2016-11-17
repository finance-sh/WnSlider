
/**
 * slider 全屏滑动组件 
 * @class slider
 * @param {object} opts
 * @param {string} opts.wrap='.wrap' 容器 
 * @param {string} opts.item='.item'  滚动单元的元素
 * @param {string} opts.playClass='play'  触发播放动画的class
 * @param {number} [opts.index=0]  设置初始显示的页码
 * @param {array} [opts.noslide=[]]  设置禁止滑动的页面序号(0开始), 禁止后 需要开发者手动绑定页面中的某个按钮事件进行滑动 
 * @param {number} [opts.speed=400] 动画速度 单位:ms
 * @param {number} [opts.triggerDist=30] 触发滑动的手指移动最小位移 单位:像素
 * @param {boolean} [opts.isVertical=true] 是否是垂直滑动 默认是.  设成false为水平滑动.
 * @param {boolean} [opts.useACC=true] 是否启用硬件加速 默认启用
 * @param {boolean} [opts.fullScr=true] 是否是全屏的 默认是. 如果是局部滑动,请设为false
 * @param {boolean} [opts.preventMove=false] 是否阻止系统默认的touchmove移动事件,  默认不阻止, 该参数仅在局部滚动时有效,   如果是局部滚动 如果为true 那么在这个区域滑动的时候 将不会滚动页面.  如果是全屏情况 则会阻止
 * @param {boolean} [opts.lastLocate=true] 后退后定位到上次浏览的位置 默认true
 * @param {function} [opts.onslide]  滑动后回调函数  会回传index参数
 * @param {array} [opts.loadingImgs]  loading需要加载的图片地址列表
 * @param {function} [opts.onloading]  loading时每加载完成一个图片都会触发这个回调  回调时参数值为 (已加载个数,总数)
 * @param {number} [opts.loadingOverTime=15]  预加载超时时间 单位:秒
 * @desc 
 */

function slider(opts) {
    this.opts={
        wrap:'.wrap',
        item:'.item',
        playClass:'play',
        index:0,
        noslide:[],
        noslideBack:false, //当noslide生效的时候 是否允许往回滑动  默认不允许, 如果有需要可以开启
        speed:400, //滑屏速度 单位:ms
        triggerDist:45,//触发滑动的手指移动最小位移 单位:像素
        isVertical:true,//垂直滑还是水平滑动
        useACC:true, //是否启用硬件加速 默认启用
        fullScr:true, //是否是全屏的 默认是. 如果是局部滑动,请设为false
        preventMove:false, //是否阻止系统默认的touchmove移动事件,  默认不阻止, 该参数仅在局部滚动时有效,   如果是局部滚动 如果为true 那么在这个区域滑动的时候 将不会滚动页面.  如果是全屏情况 则会阻止
        lastLocate:true, //后退后定位到上次浏览的位置 默认开启
        loadingImgs:[], //loading 预加载图片地址列表
        onslide:function (index) {},//滑动回调 参数是本对象
        onloading:function (loaded,total) {},
        loadingOverTime:15 //预加载超时时间 单位:秒
    }

    for (var i in opts) {
        this.opts[i]=opts[i];
    }

    this.SS=false;
    try {
        this.SS=sessionStorage;
        this.SS['spt']=1;//检测是否是ios私密浏览模式 如果是私密模式 这一行会报错 进入到catch
    }catch (e) {
        this.SS=0;
    }

    this.init();
}
/**  @lends slider */
slider.prototype={
    wrap:null,
    index : 0,
    length:0,
    _tpl:[],
    _delayTime:400,
    _sessionKey : location.host+location.pathname,
    _prev:0,
    _current:0,
    _next:0,
    $:function (o,p) {
        return (p||document).querySelector(o);
    },
    addClass:function (o,cls) {
        if (o.classList) {
            o.classList.add(cls)
        }else {
            o.className+=' '+cls;
        }
    },
    removeClass:function (o,cls) {
        if (o.classList) {
            o.classList.remove(cls)
        }else {
            o.className=o.className.replace(new RegExp('\\s*\\b'+cls+'\\b','g'),'')
        }
    },
	init:function () {
        this.wrap = typeof this.opts.wrap=='string' ? this.$(this.opts.wrap) : this.opts.wrap ;
        this._tpl = this.wrap.children;
        this.length = this._tpl.length;
        if (this.opts.loadingImgs && this.opts.loadingImgs.length) {
            this._loading();
        }else {
            this._pageInit();
        }
        // this._pageInit();
        this._bindEvt();
	},
    _bindEvt:function () {
        var self = this;
        var handlrElm= this.opts.fullScr ? this.$('body') : this.wrap;
        handlrElm.addEventListener('touchstart',function (e) {
            self._touchstart(e);
        },false);
        handlrElm.addEventListener('touchmove',function (e) {
            self._touchmove(e);
            if (!self.opts.fullScr) { //修复手Q中局部使用时的一个bug
                e.stopPropagation();
                e.preventDefault();
            }
        },false);
        handlrElm.addEventListener('touchend',function (e) {
            self._touchend(e);
        },false);
        handlrElm.addEventListener('touchcancel',function (e) {
            self._touchend(e);
        },false);

        if (this.opts.fullScr || this.opts.preventMove) {
            handlrElm.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
            // $("body").on('touchmove', function (e) { e.preventDefault(); });
        }
    },
    _pageInit:function () {
        var self = this;
        setTimeout(function () {
            var item = self._tpl[self._current];
            // 为了防止部分手机加载闪屏
            // setTimeout(function () {
            //     $("body").css("opacity", 1);
            //     // $(".loading").hide();
            // }, 100);
            self.addClass(item, self.opts.playClass);

            // 如果初始化的index不为0，修改当前_current
            if(self.opts.index) {
                self._current = self.opts.index;
                self.slideTo(self._current, 1);
            }
            try {
                self.opts.onslide.call(self,self._current);
            } catch (e) {
//                console.info(e)
            }
        },this._delayTime);
    },
	_touchstart : function (e) {
        var self=this;
		if(e.touches.length !== 1){return;}//如果大于1个手指，则不处理
        
        this._touchstartX=e.touches[0].pageX;
        this._touchstartY=e.touches[0].pageY;

		this.touchInitPos = this.opts.isVertical ? e.touches[0].pageY:e.touches[0].pageX; // 每次move的触点位置
		this.deltaX1 = this.touchInitPos;//touchstart的时候的原始位置

		this.startPos = 0;
		this.startPosPrev = -this.scrollDist;
		this.startPosNext = this.scrollDist;
	
	},
	_touchmove : function (e) {
        var parent=e.target;
        do {
            parent=parent.parentNode;
        } while (parent && parent!=this.wrap);
 
        if (!parent && e.target!=this.wrap ) {
            return ;
        }

        var self = this;
		if(e.touches.length !== 1){return;}

        var gx=Math.abs(e.touches[0].pageX - this._touchstartX);
        var gy=Math.abs(e.touches[0].pageY - this._touchstartY);

		var currentX = this.opts.isVertical ? e.touches[0].pageY:e.touches[0].pageX;
		this.deltaX2 = currentX - this.deltaX1;//记录当次移动的偏移量
		this.totalDist = this.startPos + currentX - this.touchInitPos;

		this.startPos = this.totalDist;

		this.touchInitPos = currentX;
        // 处理滑出边界的情况
        if(e.touches[0].pageY < 1 || e.touches[0].pageY > (document.documentElement.clientHeight - 1)) {
            self._touchend();
        }
	},
    _touchend : function (e) {
		if(this.deltaX2 < -this.opts.triggerDist){
			this.next();
		}else if(this.deltaX2 > this.opts.triggerDist){
			this.prev();
		}
		this.deltaX2 = 0;
	},
    _getTransform:function (dist) {
        return ';-webkit-transform:' + (this.opts.useACC ? 'translate3d(0,'+dist+',0)' : 'translate('+pos+')');
    },
    /** 
     * 滑动到上一页
     * @example
        s1.prev();
     */
    prev:function () {
        var self = this;

        if (this._current <= 0) {
            return false;
        }else {
            this._current--;
        }
        this.wrap.style.cssText = '-webkit-transition-duration:'+this.opts.speed+'ms;'+this._getTransform(this._current?("-" + this._current + "00%"):0);
        this.onSlideCall();
    },

    /** 
     * 滑动到下一页
     * @example
        s1.next();
     */
    next:function () {
        var self = this;

        if (this._current < this.length-1) {
            this._current++;
        }else {
            return false;
        }
        this.wrap.style.cssText = '-webkit-transition-duration:'+this.opts.speed+'ms;'+this._getTransform(this._current?("-" + this._current + "00%"):0);
        this.onSlideCall();
    },
    onSlideCall: function () {
        var self = this;
        if(this._current == 0) {
            this.addClass(this._tpl[this._current], this.opts.playClass);
        } else {
            this.removeClass(this._tpl[0], this.opts.playClass);
        }
        // this.addClass(this._tpl[this._current], this.opts.playClass);
        // for(var i=0; i<this.length; i++) {
        //     if(this._current != i) {
        //         this.removeClass(this._tpl[i], this.opts.playClass);
        //     }
        // }
        try {
            self.opts.onslide.call(self,self._current);
        } catch (e) {
//                console.info(e)
        }
    },
    _loading:function () {
        var self = this;
        var imgurls=this.opts.loadingImgs;
        var fallback=setTimeout(function () {
            try {
                self.opts.onloading.call(self,total,total);
            } catch (e) { }

            self._pageInit();
        },this.opts.loadingOverTime*1000);//loading超时时间  万一进度条卡那了 15秒后直接显示

        var imgs=[], loaded=1;
        var total=imgurls.length+1;
        for (var i=0; i<imgurls.length; i++) {
            imgs[i]=new Image();
            imgs[i].src=imgurls[i];
            imgs[i].onload=imgs[i].onerror=imgs[i].onabort=function (e) {
                loaded++;
                if (this.src === imgurls[0] && e.type === 'load') {
                    clearTimeout(fallback)
                }
                checkloaded();
                this.onload=this.onerror=this.onabort=null;
            }
        }

        try {
            self.opts.onloading.call(self,1,total);
        } catch (e) { }

        function checkloaded() {
            try {
                self.opts.onloading.call(self,loaded,total);
            } catch (e) { }
            if (loaded==total) {
                if (fallback) {
                    clearTimeout(fallback)
                }
                self._pageInit();
                imgs=null;
                if (self.opts.preLoadingImgs && self.opts.preLoadingImgs.length) {
                    self.preloading();
                }
            }
        }
    },
    /** 
     * 跳转到指定页码
     * @param {number} index 页码 从0开始的
     * @example
        s1.slideTo(3);
     */
    slideTo:function (index, time) {
        var t = time || this.opts.speed;
        var self = this;

        if (index <= this.length-1) {
            this._current = index;
        }else {
            return false;
        }
        this.wrap.style.cssText = '-webkit-transition-duration:'+t+'ms;'+this._getTransform(this._current?("-" + this._current + "00%"):0);
        this.onSlideCall();
    }

};

if (typeof module == 'object') {
    module.exports=slider;
}else {
    window.slider=slider;
}