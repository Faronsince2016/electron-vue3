'use strict';
const config = require('../config');
const {remote, ipcRenderer} = require('electron');
const doc = document;

/**
 * 去除空格
 * */
let trim = (str) => str.replace(/^\s*|\s*$/g, "");

/**
 * 判空
 * */
let isNull = (arg) => {
    if (typeof arg === 'string') arg = trim(arg);
    return !arg && arg !== 0 && typeof arg !== "boolean" ? true : false
};

/**
 * 随机整数
 * 例如 6-10 （m-n）
 * */
let Random = (m, n) => Math.floor(Math.random() * (n - m)) + m;

/**
 * 数组元素互换
 * */
let swapArr = (arr, index1, index2) => [arr[index1], arr[index2]] = [arr[index2], arr[index1]];

/**
 * isJson
 * str : string
 * */
let toJSON = (str) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return str;
    }
};

/**
 * 浏览器缓存
 * */
let storage = {
    set(key, value, sk) {
        sk = sk ? 'sessionStorage' : 'localStorage';
        if (typeof value === "boolean" || typeof value === "string") eval(sk).setItem(key, value);
        else eval(sk).setItem(key, JSON.stringify(value));
    },
    get(key, sk) {
        sk = sk ? 'sessionStorage' : 'localStorage';
        let data = eval(sk).getItem(key);
        if (isNull(data)) return null;
        return toJSON(data);
    },
    remove(key, sk) {
        sk = sk ? 'sessionStorage' : 'localStorage';
        eval(sk).removeItem(key);
    },
    clear(is, sk) {
        sk = sk ? 'sessionStorage' : 'localStorage';
        if (is) {
            sessionStorage.clear();
            localStorage.clear();
        } else eval(sk).clear();
    }
};

/**
 * 对象转url参数
 * */
let convertObj = (data) => {
    let _result = [];
    for (let key in data) {
        let value = data[key];
        if (value && value.constructor == Array) {
            value.forEach(function (_value) {
                _result.push(key + "=" + _value);
            });
        } else {
            _result.push(key + '=' + value);
        }
    }
    return _result.join('&');
};

/**
 * 网络请求
 * */
let net = (url, param) => {
    let sendData = {
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            'Authorization': storage.get('Authorization', true) || ''
        },
        outTime: 30000,
        mode: 'cors'
    };
    param = param || {};
    if (param.headers) sendData.headers = param.headers;
    if (param.outTime) sendData.outTime = param.outTime;
    if (param.mode) sendData.mode = param.mode;
    sendData.method = param.method || 'GET';
    if (sendData.method === 'GET') url = url + convertObj(param.data);
    else sendData.body = JSON.stringify(param.data);
    let checkStatus = (res) => {
        if (res.status >= 200 && res.status < 300) {
            let Authorization = res.headers.get('Authorization');
            if (Authorization) storage.set('Authorization', res.headers.get('Authorization'), true);
            return res;
        }
        const error = new Error(res.statusText);
        error.response = res;
        throw error;
    };
    let timeoutPromise = () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject({code: -1, msg: '超时'});
            }, sendData.outTime);
        });
    };
    let fetchPromise = () => {
        return new Promise((resolve, reject) => {
            fetch(url, sendData)
                .then(checkStatus)
                .then(res => res.text())
                .then(data => resolve(toJSON(data)))
                .catch(err => reject(err))
        });
    };
    return new Promise((resolve, reject) => {
        Promise.race([timeoutPromise(), fetchPromise()])
            .then(data => resolve(data))
            .catch(err => reject(err))
    });
};

/**
 * 动态加载css/js文件
 * */
let loadCssJs = (srcList) => {
    srcList = srcList || [];
    let doc = document;
    let list = [];
    for (let i = 0, len = srcList.length; i < len; i++) {
        let item = srcList[i];
        if (!item) break;
        let type = item.split('.')[1];
        let dom = doc.createElement(type === 'css' ? 'link' : 'script');
        let node = (type === 'css') ? doc.getElementsByTagName("head")[0] : doc.body;
        if (type === 'css') {
            dom.setAttribute('rel', 'stylesheet');
            dom.setAttribute('href', item);
        } else {
            dom.setAttribute('type', 'text/javascript');
            dom.setAttribute('src', item);
        }
        node.appendChild(dom);
        list.push(new Promise(resolve => {
            if (dom.readyState) {
                dom.onreadystatechange = () => {
                    if (dom.readyState === 'complete' || dom.readyState === 'loaded') resolve();
                }
            } else dom.onload = () => resolve();
        }))
    }
    return new Promise(resolve => {
        Promise.all(list).then(values => resolve(values));
    })
};

/**
 * 移除已经加载过的css/js文件
 * */
let removeCssJs = (srcList) => {
    srcList = srcList || [];
    for (let i = 0, len = srcList.length; i < len; i++) {
        let items = srcList[i];
        let type = items.split('.')[1];
        let element = (type === 'css') ? 'link' : 'script';
        let attr = (type === 'css') ? 'href' : 'src';
        let suspects = document.getElementsByTagName(element);
        for (let s = 0, len = suspects.length; s < len; s++) {
            let item = suspects[s];
            if (!item) break;
            let attrs = item[attr];
            if (attrs != null && attrs.indexOf(items) > -1) item.parentNode.removeChild(item);
        }
    }
};

/**
 * 弹框初始化参数
 * */
let dataJsonPort = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer.on('dataJsonPort', async (event, message) => {
            resolve(message);
        });
    });
};

/**
 * 主体初始化
 * @param Vue
 * */
let init = async (Vue, el, conf) => {
    conf = conf ? JSON.parse(decodeURIComponent(conf)) : null;
    Vue.prototype.$config = config;
    Vue.prototype.$util = {
        trim,
        isNull,
        Random,
        swapArr,
        net,
        loadCssJs,
        removeCssJs,
        storage,
        remote,
        ipcRenderer
    };
    Vue.prototype.$srl = (srl) => config.url + srl;
    const view = async (key, view) => {
        let {lib, main} = require(view);
        Vue.component(key, main);
        return lib;
    };
    let viewsList = [];
    for (let i of config[`${el}-assembly`]) {
        viewsList.push(view(`${el}-${i.substring(i.lastIndexOf('/') + 1, i.lastIndexOf('.'))}`, i));
    }
    await Promise.all(viewsList);
    const AppComponents = {};
    for (let i of config[`${el}-views`]) {
        i.name = `${el}-${i.v.substring(i.v.lastIndexOf('/') + 1, i.v.lastIndexOf('.'))}`;
        AppComponents[i.name] = i;
    }
    let app_data = {
        IComponent: null,
        AppComponents,
        loadedComponents: [],
        head: true
    };
    if (conf) app_data.conf = conf;
    app_data.isWs = false;  //是否开启ws
    return {
        el: `#${el}`,
        data: app_data,
        async created() {
            if (this.conf) this.init(this.conf.v);
            else this.init(`${el}-home`);
        },
        methods: {
            async init(componentName) {
                this.wsMessage(componentName);
                this.dialogMessage();
                if (this.isWs && !this.conf) await this.wsInit();
                if (!this.isWs && !this.conf) await this.switchComponent(componentName);
                if (this.conf) await this.switchComponent(componentName);
            },
            async switchComponent(key) {
                let libList = [];
                if (this.loadedComponents.indexOf(key) < 0) {
                    let lib = await view(key, this.AppComponents[key].v);
                    libList.push(this.$util.loadCssJs(lib));
                    if (this.loadedComponents.length > 0) libList.push(this.$util.removeCssJs(this.IComponent.lib));
                    this.AppComponents[key].lib = lib;
                } else {
                    libList.push(this.$util.loadCssJs(this.AppComponents[key].lib));
                    libList.push(this.$util.removeCssJs(this.IComponent.lib));
                }
                await Promise.all(libList);
                this.IComponent = this.AppComponents[key];
            },
            wsMessage(componentName) {
                this.$util.ipcRenderer.on('data', (event, req) => {
                    switch (req.code) {
                        case 11:
                            //连接成功
                            console.log('[ws] ready');
                            if (this.isWs && !this.conf) this.switchComponent(componentName);
                            break;
                        case 22:
                            //刷新token
                            this.$util.storage.set('Authorization', req.data, true);
                            break;
                        case 0:
                            let path = req.result.split('.');
                            if (path.length === 1) this[path[0]] = req.data;
                            if (path.length === 2) if (this.$refs[path[0]]) this.$refs[path[0]][path[1]] = req.data;
                            break;
                        case -1:
                            console.log(req.msg);
                            break;
                        case -2:
                            this.dialogInit({
                                name: '错误提示（3秒后关闭程序）',
                                v: 'dialog-message',
                                data: {
                                    text: req.msg
                                }
                            });
                            setTimeout(() => {
                                this.$util.ipcRenderer.send('closed');
                            }, 3000)
                            break;
                        default:
                            console.log('wsMessage...');
                    }
                })
            },
            wsInit() {
                let args = {
                    protocols: this.$util.storage.get('Authorization', true) || null,
                    address: this.$config.ws,
                    options: null
                };
                this.$util.ipcRenderer.send('wsInit', args);
            },
            wsSend(path, result, data) {
                this.$util.ipcRenderer.send('wsSend', JSON.stringify({path, result, data}));
            },
            dialogInit(data) {
                let args = {
                    name: data.name, //名称
                    v: data.v, //页面id
                    data: data.data, //数据
                    width: 400,
                    height: 150,
                    complex: false //是否支持多窗口
                };
                if (data.v === 'dialog-message') args.complex = true;
                if (data.r) args.r = data.r;
                if (data.width) args.width = data.width;
                if (data.height) args.height = data.height;
                if (data.complex) args.complex = data.complex;
                this.$util.ipcRenderer.send('new-dialog', args);
            },
            dialogMessage() {
                this.$util.ipcRenderer.on('newWin-rbk', (event, req) => {
                    let path = req.r.split('.');
                    if (path.length === 1) this[path[0]] = req.data;
                    if (path.length === 2) if (this.$refs[path[0]]) this.$refs[path[0]][path[1]] = req.data;
                })
            },
            dialogSend(args) {
                this.$util.ipcRenderer.send('newWin-feedback', args);
            }
        },
        watch: {
            IComponent(val) {
                let index1 = this.loadedComponents.indexOf(val.name);
                if (index1 < 0) this.loadedComponents.unshift(val.name);
                else this.$util.swapArr(this.loadedComponents, index1, 0);
            }
        }
    }
};

module.exports = {init, dataJsonPort};