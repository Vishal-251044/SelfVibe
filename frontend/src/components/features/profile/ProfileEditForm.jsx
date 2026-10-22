"use client";

/**
 * Edit name, bio and avatar. Sends only the fields that changed.
 */
import { useState } from "react";
import { User } from "lucide-react";
import TextField from "@/components/ui/TextField";
import TextAreaField from "@/components/ui/TextAreaField";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import AvatarUploader from "@/components/features/profile/AvatarUploader";
import { useAuthStore } from "@/store/authStore";
import { updateMe } from "@/services/user.service";

const BIO_MAX_LENGTH = 300;
const NAME_MAX_LENGTH = 80;

/**
 * @param {Object} props
 * @param {Object} props.user - Current user
 * @param {() => void} props.onDone - Called after save or cancel
 */
export default function ProfileEditForm({ user, onDone }) {
  const setUser = useAuthStore((state) => state.setUser);
  const [values, setValues] = useState({
    name: user.name,
    bio: user.bio ?? "",
    avatar: user.avatar ?? null,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const name = values.name.trim();
    if (!name) {
      setErrors({ name: "Enter your name" });
      return;
    }

    // Only send what changed
    const changes = {};
    if (name !== user.name) changes.name = name;
    if (values.bio.trim() !== (user.bio ?? "")) changes.bio = values.bio.trim();
    if (values.avatar !== (user.avatar ?? null)) changes.avatar = values.avatar;
    if (Object.keys(changes).length === 0) {
      onDone();
      return;
    }

    setIsSaving(true);
    try {
      const { user: updatedUser } = await updateMe(changes);
      setUser(updatedUser);
      onDone();
    } catch (error) {
      if (error?.details?.fields) setErrors(error.details.fields);
      setFormError(error?.message ?? "Couldn't save your profile. Try again.");
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-5 text-left">
      <AvatarUploader
        name={values.name}
        value={values.avatar}
        onChange={(url) => update("avatar", url)}
        onUploadingChange={setIsUploading}
      />
      {errors.avatar && <p className="text-center text-xs text-danger">{errors.avatar}</p>}

      <FormAlert message={formError} />

      <TextField
        label="Name"
        name="name"
        icon={User}
        value={values.name}
        maxLength={NAME_MAX_LENGTH}
        autoComplete="name"
        onChange={(event) => update("name", event.target.value)}
        error={errors.name}
      />
      <TextAreaField
        label="Bio"
        name="bio"
        value={values.bio}
        maxLength={BIO_MAX_LENGTH}
        placeholder="What do you listen to? What do you make?"
        onChange={(event) => update("bio", event.target.value)}
        error={errors.bio}
      />

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onDone} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving} disabled={isUploading}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
