import { createRouter, createWebHistory } from "vue-router";
import Rank from "@/views/Rank.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/rank",
    },
    {
      path: "/rank",
      name: "rank",
      component: Rank,
    },
    {
      path: "/run/:id",
      name: "run",
      component: () => import("../views/Run.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/Login.vue"),
    },
    {
      path: "/signup",
      name: "signup",
      component: () => import("../views/Signup.vue"),
    },
    {
      path: "/space",
      name: "space",
      component: () => import("../views/Space/Space.vue"),
      children: [
        {
          path: "profile",
          name: "profile",
          component: () => import("../views/Space/views/Profile.vue"),
        },
        {
          path: "binding",
          name: "binding",
          component: () => import("../views/Space/views/Binding.vue"),
        },
      ],
    },
    {
      path: "/manage",
      name: "manage",
      component: () => import("../views/Manage/Manage.vue"),
      children: [
        {
          path: "upload",
          name: "upload",
          component: () => import("../views/Manage/views/Upload.vue"),
        },
      ],
    },
  ],
});

export default router;
