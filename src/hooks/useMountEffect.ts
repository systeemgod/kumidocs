import { useEffect, type EffectCallback } from 'react';

export function useMountEffect(effect: EffectCallback) {
	/* eslint-disable react-hooks/exhaustive-deps */
	useEffect(effect, []);
}
