<style lang="scss">
.info {
  width: 100%;
  height: 100%;
  padding: 30px 10px 10px;
}
</style>

<template>
  <div class="container" :class="platform" :style="{'--accentColor':'#'+accentColor}">
    <Head></Head>
    <div class="info">
      <div>内部资源内容: {{ readFileSync(getInsidePath("t.txt")).toString() }}</div>
      <div>外部资源内容: {{ readFileSync(getExternPath("t.txt")).toString() }}</div>
      <button @click="toAbout">关于</button>
      <button @click="test">弹个框</button>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent,onMounted, onUnmounted, watch} from "vue";
import Head from "../components/Head.vue";
import {readFileSync} from "fs";
import {argsData, messageData} from "@/renderer/store";
import {windowCreate, windowShow} from "@/renderer/utils/window";
import {getInsidePath, getExternPath, getGlobal} from "@/lib";
import {WindowOpt} from "@/lib/interface";

export default defineComponent({
  components: {
    Head
  },
  name: "Home",
  setup() {
    let watchTest = watch(() => messageData["test"], (n, o) => { // n 为新赋值 o为旧值
      console.log(n, o)
    });

    function test() {
      let data: WindowOpt = {
        title: "弹框测试",
        route: "/message",
        parentId: argsData.window.id,
        data: {text: getGlobal("setting")},
        modal: true,
        resizable: true
      }
      windowCreate(data);
    }

    function toAbout() {
      let data: WindowOpt = {
        route: "/about",
        width: 300,
        height: 300,
        isMainWin: true,
        resizable: true
      }
      windowCreate(data);
    }

    onMounted(()=>{
      windowShow(argsData.window.id);
    })

    onUnmounted(() => {
      watchTest()
    })

    return {
      platform: argsData.window.platform,
      accentColor: argsData.window.appInfo.accentColor,
      readFileSync,
      getInsidePath,
      getExternPath,
      test,
      toAbout
    }
  }
});
</script>
