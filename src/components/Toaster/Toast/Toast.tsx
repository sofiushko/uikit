import React from 'react';
import {block} from '../../utils/cn';
import {Icon} from '../../Icon';
import {Button} from '../../Button';
import {Link} from '../../Link';
import {CrossIcon} from '../../icons/CrossIcon';
import {AttentionToast} from '../../icons/AttentionToast';
import {SuccessToast} from '../../icons/SuccessToast';

import './Toast.scss';

const b = block('toast');

const FADE_IN_LAST_ANIMATION_NAME = 'move-left';
const FADE_OUT_LAST_ANIMATION_NAME = 'remove-height';

const DEFAULT_TIMEOUT = 5000;

const TITLE_ICONS = {
    error: AttentionToast,
    success: SuccessToast,
};

export interface ToastAction {
    label: string;
    onClick: VoidFunction;
    removeAfterClick?: boolean;
}

export type ToastType = 'error' | 'success';

export interface ToastGeneralProps {
    name: string;
    title?: string;
    className?: string;
    timeout?: number;
    allowAutoHiding?: boolean;
    content?: React.ReactNode;
    type?: ToastType;
    isClosable?: boolean;
    isOverride?: boolean;
    actions?: ToastAction[];
}

interface ToastInnerProps {
    removeCallback: VoidFunction;
}

interface ToastProps extends ToastGeneralProps, ToastInnerProps {}

enum ToastStatus {
    creating = 'creating',
    showingIndents = 'showing-indents',
    showingHeight = 'showing-height',
    hiding = 'hiding',
    shown = 'shown',
}

type ToastStyles = {
    height?: number;
    position?: 'relative';
};

function useTimer({
    remove,
    ref,
    timeout,
}: {
    remove: VoidFunction;
    ref: React.RefObject<HTMLDivElement>;
    timeout?: number;
}): [VoidFunction, VoidFunction] {
    const timerId = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const setTimer = React.useCallback(() => {
        if (!timeout) {
            return;
        }

        timerId.current = setTimeout(async () => {
            if (ref.current) {
                remove();
            }
        }, timeout);
    }, [timeout, remove, ref]);

    const clearTimer = React.useCallback(() => {
        if (timerId.current) {
            clearTimeout(timerId.current);
            timerId.current = undefined;
        }
    }, []);

    React.useEffect(() => {
        setTimer();
        return () => {
            clearTimer();
        };
    }, [setTimer, clearTimer]);

    return [setTimer, clearTimer];
}

function useHeight({ref, isOverride}: any) {
    const [height, setHeight] = React.useState<number | undefined>(undefined);

    const getToastHeight = React.useCallback(() => {
        return ref.current?.offsetHeight;
    }, [ref]);

    React.useEffect(() => {
        setHeight(getToastHeight());
    }, [getToastHeight]);

    React.useEffect(() => {
        if (isOverride) {
            setHeight(getToastHeight());
        }
    }, [isOverride, getToastHeight]);

    return height;
}

export function Toast(props: ToastProps) {
    const [status, setStatus] = React.useState<ToastStatus>(ToastStatus.creating);

    React.useEffect(() => {
        setStatus(ToastStatus.showingIndents);
    }, []);

    React.useEffect(() => {
        if (status === ToastStatus.showingIndents) {
            setStatus(ToastStatus.showingHeight);
        }
    }, [status]);

    const ref = React.useRef<HTMLDivElement>(null);

    const {allowAutoHiding = true, isClosable = true, isOverride = false} = props;

    const remove = React.useCallback(() => {
        setStatus(ToastStatus.hiding);
    }, []);

    const height = useHeight({ref, isOverride});

    const [setTimer, clearTimer] = useTimer({
        remove,
        ref,
        timeout: allowAutoHiding ? props.timeout || DEFAULT_TIMEOUT : undefined,
    });

    const getStyles = () => {
        const styles: ToastStyles = {};

        if (height && status !== ToastStatus.showingIndents && status !== ToastStatus.shown) {
            styles.height = height;
        }

        if (status !== 'creating') {
            styles.position = 'relative';
        }

        return styles;
    };

    const mods = {
        appearing: status === ToastStatus.showingIndents || status === ToastStatus.showingHeight,
        'show-animation': status === ToastStatus.showingHeight,
        'hide-animation': status === ToastStatus.hiding,
    };

    const getTitleIcon = () => {
        const {type} = props;
        const icon = type ? TITLE_ICONS[type] : null;

        if (!icon) {
            return null;
        }

        return <Icon data={icon} className={b('icon', {title: true})} />;
    };

    const getCloseButton = () => {
        if (!isClosable) {
            return null;
        }

        return (
            <Button
                view="flat-secondary"
                size="s"
                style={{position: 'absolute', top: 10, right: 10}}
                onClick={remove}
            >
                <Icon data={CrossIcon} />
            </Button>
        );
    };

    const getActions = () => {
        const {actions} = props;

        if (!actions) {
            return null;
        }

        return actions.map(({label, onClick, removeAfterClick = true}, index) => {
            const onActionClick = () => {
                onClick();
                if (removeAfterClick) {
                    remove();
                }
            };

            return (
                <Link key={`${label}__${index}`} className={b('action')} onClick={onActionClick}>
                    {label}
                </Link>
            );
        });
    };

    const onFadeInAnimationEnd = (e: {animationName: string}) => {
        if (e.animationName === FADE_IN_LAST_ANIMATION_NAME) {
            setStatus(ToastStatus.shown);
        }
    };

    const onFadeOutAnimationEnd = (e: {animationName: string}) => {
        const {removeCallback} = props;
        if (e.animationName === FADE_OUT_LAST_ANIMATION_NAME) {
            removeCallback();
        }
    };

    const getAnimationEndHandler = () => {
        if (status === ToastStatus.showingHeight) {
            return onFadeInAnimationEnd;
        }

        if (status === ToastStatus.hiding) {
            return onFadeOutAnimationEnd;
        }

        return undefined;
    };

    const onMouseOver = () => {
        clearTimer();
    };

    const onMouseLeave = () => {
        setTimer();
    };

    const {content, actions, title, className} = props;
    return (
        <div
            ref={ref}
            className={b(mods, className)}
            style={getStyles()}
            onAnimationEnd={getAnimationEndHandler()}
            onMouseOver={onMouseOver}
            onMouseLeave={onMouseLeave}
        >
            <div className={b('title', {bold: Boolean(content || actions)})}>
                {getTitleIcon()}
                {title}
            </div>
            {getCloseButton()}
            {content}
            {getActions()}
        </div>
    );
}
