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
      path: "/binding",
      name: "binding",
      component: () => import("../views/Binding.vue"),
    },
  ],
});

export default router;
