/**
 * Created by liwencheng on 16/8/3.
 */

window.debug = true;

function L(msg) {
    console.log(msg);
}

var myslider;
var _init = function () {
    window.onwheel = function () {
        return false;
    };

    myslider = new slider({
        wrap: '#wrap',
        item: '.item',
        index: 0,
        loadingImgs: ["images/bg.jpg"],
        onslide: function (index) {
            // index 从0开始计数
            $($(".global li").removeClass("active").get(index)).addClass("active");
        }
    });
};
_init();

