# Sounds

Both clips are synthesized from scratch with ffmpeg (no samples) and released under
[CC0](https://creativecommons.org/publicdomain/zero/1.0/). Regenerate them with:

```bash
# pip: a short rising chirp, played when Claude waits for you (~180 ms)
ffmpeg -y -f lavfi -i "aevalsrc='0.45*sin(2*PI*(1100*t+3000*t*t))*exp(-9*t)':s=22050:d=0.18" -ac 1 pip.wav

# burp: a low, wobbling tone with a little filtered noise, played after /compact (~280 ms)
ffmpeg -y -f lavfi -i "aevalsrc='0.55*sin(2*PI*(95*t-60*t*t))*(0.6+0.4*sin(2*PI*28*t))*sin(PI*t/0.28)+0.12*random(0)*sin(PI*t/0.28)':s=22050:d=0.28" -af "lowpass=f=600" -ac 1 burp.wav
```

Sounds play only for the `wait` and `burp` states. `/clawd mute` silences them.
