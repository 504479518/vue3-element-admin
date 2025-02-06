import type { RouteRecordRaw } from "vue-router";
import { constantRoutes } from "@/router";
import { store } from "@/store";
import router from "@/router";

import MenuAPI, { type RouteVO } from "@/api/system/menu";
const modules = import.meta.glob("../../views/**/**.vue");
const Layout = () => import("@/layout/index.vue");

export const usePermissionStore = defineStore("permission", () => {
  // 储所有路由，包括静态路由和动态路由
  const routes = ref<RouteRecordRaw[]>([]);
  // 混合模式左侧菜单路由
  const mixedLayoutLeftRoutes = ref<RouteRecordRaw[]>([]);
  // 路由是否加载完成
  const isRoutesLoaded = ref(false);

  /**
   * 获取后台动态路由数据，解析并注册到全局路由
   *
   * @returns Promise<RouteRecordRaw[]> 解析后的动态路由列表
   */
  function generateRoutes() {
    return new Promise<RouteRecordRaw[]>((resolve, reject) => {
      MenuAPI.getRoutes()
        .then((data) => {
          const dynamicRoutes = parseDynamicRoutes(data);
          routes.value = [...constantRoutes, ...dynamicRoutes];
          isRoutesLoaded.value = true;
          resolve(dynamicRoutes);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * 根据父菜单路径设置混合模式左侧菜单
   *
   * @param parentPath 父菜单的路径，用于查找对应的菜单项
   */
  const setMixedLayoutLeftRoutes = (parentPath: string) => {
    const matchedItem = routes.value.find((item) => item.path === parentPath);
    if (matchedItem && matchedItem.children) {
      mixedLayoutLeftRoutes.value = matchedItem.children;
    }
  };

  /**
   * 重置路由
   */
  const resetRouter = () => {
    // 清空本地存储的路由和菜单数据
    routes.value = [];
    mixedLayoutLeftRoutes.value = [];
    // 从 Vue Router 中移除所有动态注册的路由
    router.getRoutes().forEach((route) => {
      if (route.name) {
        router.removeRoute(route.name);
      }
    });
    isRoutesLoaded.value = false;
  };

  return {
    routes,
    mixedLayoutLeftRoutes,
    isRoutesLoaded,
    generateRoutes,
    setMixedLayoutLeftRoutes,
    resetRouter,
  };
});

/**
 * 解析后端返回的路由数据并转换为 Vue Router 兼容的路由配置
 *
 * 1. 遍历 `rawRoutes` 并转换为 `RouteRecordRaw` 格式。
 * 2. 若 `component` 为 `"Layout"`，则替换为 `Layout` 组件。
 * 3. 若 `component` 为字符串路径，则动态加载对应的 Vue 组件，找不到则默认 `404.vue`。
 * 4. 递归解析 `children`，确保子路由也被正确转换。
 *
 * @param rawRoutes 后端返回的原始路由数据
 * @returns 解析后的路由配置数组
 */
const parseDynamicRoutes = (rawRoutes: RouteVO[]): RouteRecordRaw[] => {
  const parsedRoutes: RouteRecordRaw[] = [];

  rawRoutes.forEach((route) => {
    const normalizedRoute = { ...route } as RouteRecordRaw;

    // 处理组件路径
    normalizedRoute.component =
      normalizedRoute.component?.toString() === "Layout"
        ? Layout
        : modules[`../../views/${normalizedRoute.component}.vue`] ||
          modules["../../views/error-page/404.vue"];

    // 递归解析子路由
    if (normalizedRoute.children) {
      normalizedRoute.children = parseDynamicRoutes(route.children);
    }

    parsedRoutes.push(normalizedRoute);
  });

  return parsedRoutes;
};
/**
 * 在组件外使用 Pinia store 实例 @see https://pinia.vuejs.org/core-concepts/outside-component-usage.html
 */
export function usePermissionStoreHook() {
  return usePermissionStore(store);
}
