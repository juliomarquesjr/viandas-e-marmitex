"use client";

import { Camera, Image as ImageIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { setCustomerAvatar, useCustomerAvatar } from "../../lib/avatar-store";
import { CustomerAvatar } from "../Avatar";
import { Sheet, SheetHeader } from "../kit";
import { PhotoCropper } from "./PhotoCropper";
import { initialView, loadPhoto, renderCrop, type CropView, type PhotoSource } from "./photo-utils";
import "./photo.css";

const PHOTO_URL = "/api/customer/profile/photo";
const NO_CONNECTION = "Sem conexão. Confira a internet e tente de novo.";
const DECODE_ERROR = "Esse formato de foto não é aceito. Tire uma foto nova ou escolha uma em JPEG ou PNG.";
const SAVE_ERROR = "Não foi possível salvar a foto agora. Tente de novo.";
const REMOVE_ERROR = "Não foi possível remover a foto agora. Tente de novo.";
const GALLERY_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/**
 * Folha "Foto do perfil": escolher, ajustar no círculo e enviar. Enquanto envia ou
 * remove, a folha não fecha. `onClose` precisa ser estável (o Sheet reage a ele).
 */
export function ProfilePhotoSheet({
  open,
  onClose,
  name,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  onToast: (message: string) => void;
}) {
  // Trava síncrona: vale entre o clique e o próximo render, e protege Esc e toque fora
  const locked = React.useRef(false);
  const guardedClose = React.useCallback(() => {
    if (!locked.current) onClose();
  }, [onClose]);

  return (
    <Sheet open={open} onClose={guardedClose} label="Foto do perfil">
      <PhotoSheetBody name={name} locked={locked} onClose={guardedClose} onDone={onClose} onToast={onToast} />
    </Sheet>
  );
}

type Step = "choose" | "adjust";

function PhotoSheetBody({
  name,
  locked,
  onClose,
  onDone,
  onToast,
}: {
  name: string;
  locked: React.MutableRefObject<boolean>;
  /** Fechar a pedido de quem usa (respeita a trava). */
  onClose: () => void;
  /** Fechar depois de terminar (a trava ainda está ligada neste momento). */
  onDone: () => void;
  onToast: (message: string) => void;
}) {
  const { imageUrl } = useCustomerAvatar();
  const hasPhoto = Boolean(imageUrl);

  const [step, setStep] = React.useState<Step>("choose");
  const [source, setSource] = React.useState<PhotoSource | null>(null);
  const [view, setView] = React.useState<CropView>({ zoom: 1, fx: 0, fy: 0 });
  const [preparing, setPreparing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const root = React.useRef<HTMLDivElement>(null);
  const cameraInput = React.useRef<HTMLInputElement>(null);
  const galleryInput = React.useRef<HTMLInputElement>(null);
  const decoding = React.useRef(false);
  const alive = React.useRef(true);

  React.useEffect(() => {
    alive.current = true;
    // Se a folha sumir no meio do envio, a trava não pode ficar presa para a próxima abertura
    return () => {
      alive.current = false;
      locked.current = false;
    };
  }, [locked]);

  // Ao trocar de etapa, o foco vai para o primeiro controle da nova (o Sheet cuida da abertura)
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    root.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
  }, [step, confirmRemove]);

  const busy = preparing || saving || removing;

  /* ---------------------------------------------------------- escolher */

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file || decoding.current || locked.current) return;

    decoding.current = true;
    setPreparing(true);
    setError(null);
    try {
      const loaded = await loadPhoto(file);
      if (!alive.current) return;
      setSource(loaded);
      setView(initialView(loaded));
      setStep("adjust");
    } catch {
      if (alive.current) setError(DECODE_ERROR);
    } finally {
      decoding.current = false;
      if (alive.current) setPreparing(false);
    }
  };

  /* ----------------------------------------------------------- salvar */

  const save = async () => {
    if (locked.current || decoding.current || !source) return;
    locked.current = true;
    setSaving(true);
    setError(null);

    let redirecting = false;
    try {
      const cropped = await renderCrop(source, view);
      if (!cropped) {
        setError("Não foi possível preparar a foto. Tente de novo.");
        return;
      }

      const body = new FormData();
      body.append("file", cropped.blob, cropped.filename);

      let response: Response;
      try {
        response = await fetch(PHOTO_URL, { method: "POST", body });
      } catch {
        setError(NO_CONNECTION);
        return;
      }

      if (response.status === 401) {
        redirecting = true;
        window.location.href = "/customer/login";
        return;
      }

      const json = await response.json().catch(() => null);
      if (!response.ok || typeof json?.imageUrl !== "string") {
        setError(json?.error || SAVE_ERROR);
        return;
      }

      setCustomerAvatar(json.imageUrl);
      onToast("Foto atualizada");
      locked.current = false;
      onDone();
    } finally {
      if (!redirecting) locked.current = false;
      if (alive.current && !redirecting) setSaving(false);
    }
  };

  /* ---------------------------------------------------------- remover */

  const remove = async () => {
    if (locked.current || decoding.current) return;
    locked.current = true;
    setRemoving(true);
    setError(null);

    let redirecting = false;
    try {
      let response: Response;
      try {
        response = await fetch(PHOTO_URL, { method: "DELETE" });
      } catch {
        setError(NO_CONNECTION);
        return;
      }

      if (response.status === 401) {
        redirecting = true;
        window.location.href = "/customer/login";
        return;
      }

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        setError(json?.error || REMOVE_ERROR);
        return;
      }

      setCustomerAvatar(null);
      onToast("Foto removida");
      locked.current = false;
      onDone();
    } finally {
      if (!redirecting) locked.current = false;
      if (alive.current && !redirecting) setRemoving(false);
    }
  };

  /* ------------------------------------------------------------ telas */

  const back = () => {
    if (locked.current) return;
    setStep("choose");
    setError(null);
  };

  const subtitle =
    step === "adjust"
      ? "Arraste a foto até ficar como você quer."
      : hasPhoto
        ? "Essa é a sua foto atual."
        : "Você ainda não tem foto. Aparecem as suas iniciais.";

  return (
    <div ref={root} className="c-photo">
      <SheetHeader title="Foto do perfil" subtitle={subtitle} onClose={onClose} />

      {/* Os dois campos de arquivo ficam escondidos; os botões abrem cada um */}
      <input ref={cameraInput} type="file" accept="image/*" capture="user" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" onChange={onPick} />
      <input ref={galleryInput} type="file" accept={GALLERY_ACCEPT} style={{ display: "none" }} tabIndex={-1} aria-hidden="true" onChange={onPick} />

      {step === "choose" ? (
        <>
          <div className="c-photo-now">
            <CustomerAvatar name={name} imageUrl={imageUrl} size={168} />
          </div>

          {preparing && (
            <p className="c-photo-status" role="status">
              <span className="c-spin is-ink" aria-hidden="true" />
              Preparando a foto…
            </p>
          )}

          {error && (
            <p className="c-alert" role="alert">
              {error}
            </p>
          )}

          {confirmRemove ? (
            <div className="c-photo-confirm" role="group" aria-label="Remover a foto">
              <p>Remover a foto? Você volta a aparecer com as iniciais.</p>
              <div className="c-actions">
                <button type="button" className="c-btn is-ghost" onClick={() => setConfirmRemove(false)} disabled={removing} data-autofocus="">
                  Cancelar
                </button>
                <button type="button" className="c-btn is-primary" onClick={remove} disabled={removing} aria-busy={removing}>
                  {removing && <span className="c-spin" aria-hidden="true" />}
                  {removing ? "Removendo…" : "Remover"}
                </button>
              </div>
            </div>
          ) : (
            <div className="c-photo-actions">
              <button type="button" className="c-btn is-primary" onClick={() => cameraInput.current?.click()} disabled={busy} data-autofocus="">
                <Camera size={20} aria-hidden="true" />
                Tirar foto
              </button>
              <button type="button" className="c-btn is-ghost" onClick={() => galleryInput.current?.click()} disabled={busy}>
                <ImageIcon size={20} aria-hidden="true" />
                Escolher da galeria
              </button>
              {hasPhoto && (
                <button
                  type="button"
                  className="c-btn is-ghost c-photo-danger"
                  onClick={() => {
                    setError(null);
                    setConfirmRemove(true);
                  }}
                  disabled={busy}
                >
                  <Trash2 size={20} aria-hidden="true" />
                  Remover foto
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        source && (
          <>
            <PhotoCropper source={source} view={view} onViewChange={setView} disabled={saving} />

            {saving && (
              <p className="c-photo-status" role="status">
                Enviando a foto. Não feche esta tela.
              </p>
            )}

            {error && (
              <p className="c-alert" role="alert">
                {error}
              </p>
            )}

            <div className="c-actions">
              <button type="button" className="c-btn is-ghost" onClick={back} disabled={saving}>
                Voltar
              </button>
              <button type="button" className="c-btn is-primary" onClick={save} disabled={saving} aria-busy={saving}>
                {saving && <span className="c-spin" aria-hidden="true" />}
                {saving ? "Enviando…" : error ? "Tentar de novo" : "Salvar foto"}
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
