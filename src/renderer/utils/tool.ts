const config = require('../../lib/cfg/config.json');

interface NetSendOpt extends RequestInit {
    outTime?: number; //请求超时时间
}

/**
 * 去除空格
 * */
export const trim = (str: string) => {
    return str.replace(/^\s*|\s*$/g, "");
};

/**
 * 判空
 * */
export const isNull = (arg: unknown) => {
    if (typeof arg === 'string') arg = trim(arg);
    return !arg && arg !== 0 && typeof arg !== "boolean" ? true : false;
};

/**
 * 随机整数
 * 例如 6-10 （m-n）
 * */
export const ranDom = (m: number, n: number) => {
    return Math.floor(Math.random() * (n - m)) + m;
};

/**
 * 数组元素互换
 * */
export const swapArr = (arr: unknown[], index1: number, index2: number) => {
    [arr[index1], arr[index2]] = [arr[index2], arr[index1]];
};

/**
 * 日期转换
 * @param fmt yy-MM-dd Hh:mm:ss
 * */
export const format = (fmt: string = 'yyyy-MM-dd') => {
    let date = new Date();
    let o: { [key: string]: unknown } = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "H+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        "S": date.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (let k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) as string : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

/**
 * 对象转url参数
 * */
export const convertObj = (data: any) => {
    let _result = [];
    for (let key in data) {
        let value = data[key] as Array<any>;
        if (value && value.constructor == Array) {
            value.forEach((_value) => {
                _result.push(key + "=" + _value);
            });
        } else {
            _result.push(key + "=" + value);
        }
    }
    return _result.join("&");
};

/**
 * url参数转对象
 */
export const GetQueryJson2 = (url: string) => {
    let arr = []; // 存储参数的数组
    let res: { [key: string]: unknown } = {}; // 存储最终JSON结果对象
    arr = url.split("&"); // 获取浏览器地址栏中的参数
    for (let i = 0; i < arr.length; i++) { // 遍历参数
        if (arr[i].indexOf("=") != -1) { // 如果参数中有值
            let str = arr[i].split("=");
            res[str[0]] = str[1];
        } else { // 如果参数中无值
            res[arr[i]] = "";
        }
    }
    return res;
};

/**
 * 网络请求
 * @param url string
 * @param param NetSendOpt
 * */
export const net = (url: string, param: NetSendOpt) => {
    if (url.indexOf("http://") === -1 && url.indexOf("https://") === -1) url = config.appUrl + url;
    let sendData: NetSendOpt = {
        headers: {
            "Content-type": "application/json;charset=utf-8",
            "Authorization": sessionStorage.getItem("Authorization") as string || ""
        },
        outTime: 30000,
        mode: "cors"
    };
    param = param || {};
    if (param.headers) sendData.headers = param.headers;
    if (param.outTime) sendData.outTime = param.outTime;
    if (param.mode) sendData.mode = param.mode;
    sendData.method = param.method || "GET";
    if (sendData.method === "GET") url = url + convertObj(param.body);
    else sendData.body = JSON.stringify(param.body);
    let timeoutPromise = () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject({code: -1, msg: "超时"});
            }, sendData.outTime);
        });
    };
    let fetchPromise = () => {
        return new Promise((resolve, reject) => {
            fetch(url, sendData)
                .then(res => {
                    if (res.status >= 200 && res.status < 300) {
                        let Authorization = res.headers.get("Authorization");
                        if (Authorization) sessionStorage.setItem("Authorization", Authorization);
                        return res;
                    }
                    throw new Error(res.statusText);
                })
                .then(res => res.text())
                .then(data => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                })
                .catch(err => reject(err))
        });
    };
    return new Promise((resolve, reject) => {
        Promise.race([timeoutPromise(), fetchPromise()])
            .then(data => resolve(data))
            .catch(err => reject(err))
    });
};