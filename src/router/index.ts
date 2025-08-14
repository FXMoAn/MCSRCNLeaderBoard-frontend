import { createRouter, createWebHistory } from "vue-router";
import Rank from "@/views/Rank.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/rank",
      name: "rank",
      component: Rank,
    },
    {
      path: "/",
      redirect: "/rank",
    },
    {
      path: "/run/:id",
      name: "run",
      component: () => import("../views/Run.vue"),
    },
  ],
});

export default router;
