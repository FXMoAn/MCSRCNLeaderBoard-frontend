<template>
  <div class="auth-control">
    <button class="auth-btn login-btn" @click="navigateToSignin">
      <span>登录</span>
    </button>
    <button class="auth-btn signup-btn" @click="navigateToSignup">
      <span>注册</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const navigateToSignin = () => {
  router.push("/login");
};

const navigateToSignup = () => {
  router.push("/signup");
};
</script>

<style scoped>
.auth-control {
  display: flex;
  gap: 12px;
  align-items: center;
}

.auth-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  white-space: nowrap;
}

.login-btn {
  background-color: transparent;
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.login-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.signup-btn {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  box-shadow: 0 4px 15px rgba(0, 188, 212, 0.3);
}

.signup-btn:hover {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 188, 212, 0.4);
}

.auth-btn:active {
  transform: translateY(0);
}

.auth-btn svg {
  transition: transform 0.2s ease;
}

.auth-btn:hover svg {
  transform: scale(1.1);
}

@media (max-width: 480px) {
  .auth-control {
    gap: 8px;
  }

  .auth-btn {
    padding: 8px 16px;
    font-size: 13px;
  }

  .auth-btn span {
    display: none;
  }

  .auth-btn {
    padding: 10px;
    min-width: 40px;
    justify-content: center;
  }
}
</style>
