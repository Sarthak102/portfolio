type Props = {
  name: "github" | "linkedin" | "x";
  // "light" is the white icon for dark backgrounds, "dark" the near-black one for light backgrounds.
  tone: "light" | "dark";
  size: number;
};

export function SocialIcon({ name, tone, size }: Props) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVGs, nothing for next/image to optimise
  return <img src={`/icons/${name}-${tone}.svg`} alt="" width={size} height={size} className="block" />;
}
