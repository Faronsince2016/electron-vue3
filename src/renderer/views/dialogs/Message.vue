<style lang="scss">
.info {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 25px 10px 10px;

  .text {
    font: normal 16px sans-serif;
  }

  .close {
    position: absolute;
    right: 5px;
    bottom: 5px;
  }
}
</style>

<template>
  <div class="container" :class="platform" :style="{'--accentColor':'#'+accentColor}">
    <Head></Head>
    <div class="info">
      <div class="text">
        {{ data.text }}
        <button @click="test">测试通讯</button>
      </div>
      <button class="close" @click="close">确定</button>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, onMounted} from "vue";
import {argsData} from "@/renderer/store";
import {windowClose, windowSetSize, windowShow} from "@/renderer/utils/window";
import {messageSend} from "@/renderer/utils";
import Head from "../components/Head.vue";
import {IpcMsg, IPC_MSG_TYPE} from "@/lib/interface";

export default defineComponent({
  components: {
    Head
  },
  name: "Message",
  setup() {

    windowSetSize(argsData.window.id, [400, 150], true, argsData.window.currentMaximized);
    let cons = 0;

    function test() {//测试发送 为主窗口发送消息
      let data: IpcMsg = {
        type: IPC_MSG_TYPE.WIN,
        key: "test",
        value: cons++
      };
      messageSend(data);
    }

    function close() {
      windowClose(argsData.window.id);
    }

    onMounted(() => {
      windowShow(argsData.window.id);
    })

    return {
      data: argsData.window.data,
      platform: argsData.window.platform,
      accentColor: argsData.window.appInfo.accentColor,
      test,
      close
    }
  }
});
</script>
