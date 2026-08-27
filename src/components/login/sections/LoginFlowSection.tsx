"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { AuthResponse } from "@/lib/api/types";
import {
  appendInternalSearchParam,
  sanitizeInternalPath,
} from "@/lib/navigation/safeInternalPath";
import styles from "./LoginFlowSection.module.scss";

type LoginFlowSectionProps = {
  title: string;
  description: string;
};

type AuthMode = "login" | "register";

const initialFormState = {
  email: "",
  password: "",
  minecraftName: "",
  discordName: "",
};

function buildFriendlyError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_CREDENTIALS") {
      return "Přihlášení se nepovedlo. Zkontroluj e-mail a heslo.";
    }

    if (error.code === "EMAIL_ALREADY_USED" || error.code === "EMAIL_ALREADY_EXISTS") {
      return "Tenhle e-mail už má vytvořený účet.";
    }

    if (error.code === "VALIDATION_ERROR") {
      return error.message;
    }

    return error.message;
  }

  return "Spojení se serverem se nepovedlo. Zkus to prosím znovu.";
}

export const LoginFlowSection = ({ title, description }: LoginFlowSectionProps) => {
  const t = useTranslations("login.flow");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [formState, setFormState] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextPath = useMemo(
    () => sanitizeInternalPath(searchParams.get("next"), "/account"),
    [searchParams],
  );
  const selectedPackage = searchParams.get("package");
  const storeReturnPath = useMemo(
    () =>
      selectedPackage
        ? appendInternalSearchParam("/store", "package", selectedPackage)
        : "/store",
    [selectedPackage],
  );

  const submitLabel = mode === "login" ? "Přihlásit se" : "Vytvořit účet";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? {
              email: formState.email,
              password: formState.password,
            }
          : {
              email: formState.email,
              password: formState.password,
              minecraftName: formState.minecraftName,
              discordName: formState.discordName,
            };

      await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: payload,
      });

      const target = selectedPackage
        ? appendInternalSearchParam(nextPath, "package", selectedPackage)
        : nextPath;
      router.push(target);
      router.refresh();
    } catch (error) {
      setErrorMessage(buildFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.surface}>
          <div className={styles.intro}>
            <h2>{title}</h2>
            <p>{description}</p>
            {selectedPackage ? (
              <p className={styles.notice}>
                Vybraný balíček na tebe počká. Po přihlášení tě vrátíme zpátky do nákupu.
              </p>
            ) : null}
          </div>

          <div className={styles.panel}>
            <div className={styles.modeSwitch} role="tablist" aria-label="Volba režimu přihlášení">
              <button
                className={`${styles.modeButton} ${mode === "login" ? styles.modeButtonActive : ""}`}
                onClick={() => setMode("login")}
                type="button"
              >
                Přihlášení
              </button>
              <button
                className={`${styles.modeButton} ${mode === "register" ? styles.modeButtonActive : ""}`}
                onClick={() => setMode("register")}
                type="button"
              >
                Registrace
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>E-mail</span>
                <input
                  autoComplete="email"
                  onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                  placeholder="hrac@valtherea.eu"
                  required
                  type="email"
                  value={formState.email}
                />
              </label>

              <label className={styles.field}>
                <span>Heslo</span>
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Alespoň 8 znaků"
                  required
                  type="password"
                  value={formState.password}
                />
              </label>

              {mode === "register" ? (
                <div className={styles.optionalGrid}>
                  <label className={styles.field}>
                    <span>Minecraft jméno</span>
                    <input
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, minecraftName: event.target.value }))
                      }
                      placeholder="Monasik"
                      type="text"
                      value={formState.minecraftName}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Discord jméno</span>
                    <input
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, discordName: event.target.value }))
                      }
                      placeholder="monasik"
                      type="text"
                      value={formState.discordName}
                    />
                  </label>
                </div>
              ) : null}

              {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

              <div className={styles.actions}>
                <button className="button button--primary" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Probíhá..." : submitLabel}
                </button>
                <Link className="button button--secondary" href={storeReturnPath}>
                  {t("secondary")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
