from dataclasses import dataclass


@dataclass
class CarouselCard3D:
    slot: str
    title: str
    offset_x: float
    scale: float
    opacity: float
    tilt_deg: float


def compute_3d_song_carousel(prev_title: str, current_title: str, next_title: str, bass: float = 0.0) -> list[CarouselCard3D]:
    pulse = 1.0 + bass * 0.04
    return [
        CarouselCard3D(
            slot="prev",
            title=prev_title,
            offset_x=-255.0,
            scale=0.72 * pulse,
            opacity=0.45,
            tilt_deg=14.0,
        ),
        CarouselCard3D(
            slot="next",
            title=next_title,
            offset_x=255.0,
            scale=0.72 * pulse,
            opacity=0.45,
            tilt_deg=-14.0,
        ),
        CarouselCard3D(
            slot="current",
            title=current_title,
            offset_x=0.0,
            scale=1.0 * pulse,
            opacity=1.0,
            tilt_deg=0.0,
        ),
    ]
