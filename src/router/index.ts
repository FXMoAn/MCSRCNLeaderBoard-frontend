import { createRouter, createWebHistory } from "vue-router";
import LeaderBoard from "@/views/LeaderBoard/LeaderBoard.vue";
import Rank from "@/views/Rank.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/leaderboard",
      name: "LeaderBoard",
      component: LeaderBoard,
      children: [
        {
          path: "rank",
          name: "rank",
          component: Rank,
        },
        {
          path: "space",
          name: "space",
          component: () => import("../views/Space.vue"),
        },
      ],
    },
    {
      path: "/",
      redirect: "/leaderboard/rank",
    },
  ],
});

export default router;
