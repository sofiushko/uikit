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

interface UseCloseOnTimeoutProps {
    onClose: VoidFunction;
    timeout?: number;
}

function useCloseOnTimeout({onClose, timeout}: UseCloseOnTimeoutProps): {
    onMouseLeave: VoidFunction;
    onMouseOver: VoidFunction;
} {
    const timerId = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const setTimer = React.useCallback(() => {
        if (!timeout) {
            return;
        }

        timerId.current = setTimeout(async () => {
            onClose();
        }, timeout);
    }, [timeout, onClose]);

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

    const onMouseOver = () => {
        clearTimer();
    };

    const onMouseLeave = () => {
        setTimer();
    };

    return {onMouseOver, onMouseLeave};
}

interface UseHeightProps {
    ref: React.RefObject<HTMLDivElement>;
    isOverride: boolean;
}

function useHeight({ref, isOverride}: UseHeightProps) {
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

interface UseToastStatusProps {
    onRemove: VoidFunction;
}

function useToastStatus({onRemove}: UseToastStatusProps) {
    const [status, setStatus] = React.useState<ToastStatus>(ToastStatus.creating);

    React.useEffect(() => {
        if (status === ToastStatus.creating) {
            setStatus(ToastStatus.showingIndents);
        } else if (status === ToastStatus.showingIndents) {
            setStatus(ToastStatus.showingHeight);
        }
    }, [status]);

    const onFadeInAnimationEnd = (e: {animationName: string}) => {
        if (e.animationName === FADE_IN_LAST_ANIMATION_NAME) {
            setStatus(ToastStatus.shown);
        }
    };

    const onFadeOutAnimationEnd = (e: {animationName: string}) => {
        if (e.animationName === FADE_OUT_LAST_ANIMATION_NAME) {
            onRemove();
        }
    };

    let onAnimationEnd;
    if (status === ToastStatus.showingHeight) {
        onAnimationEnd = onFadeInAnimationEnd;
    }
    if (status === ToastStatus.hiding) {
        onAnimationEnd = onFadeOutAnimationEnd;
    }

    const handleClose = React.useCallback(() => {
        setStatus(ToastStatus.hiding);
    }, []);

    return {status, containerProps: {onAnimationEnd}, handleClose};
}

interface RenderActionsProps {
    actions?: ToastAction[];
    onClose: VoidFunction;
}

function renderActions({actions, onClose}: RenderActionsProps) {
    if (!actions) {
        return null;
    }

    return actions.map(({label, onClick, removeAfterClick = true}, index) => {
        const onActionClick = () => {
            onClick();
            if (removeAfterClick) {
                onClose();
            }
        };

        return (
            <Link key={`${label}__${index}`} className={b('action')} onClick={onActionClick}>
                {label}
            </Link>
        );
    });
}

interface RenderIconProps {
    type?: ToastType;
}

function renderIcon({type}: RenderIconProps) {
    const icon = type ? TITLE_ICONS[type] : null;

    if (!icon) {
        return null;
    }

    return <Icon data={icon} className={b('icon', {title: true})} />;
}

export function Toast(props: ToastProps) {
    const ref = React.useRef<HTMLDivElement>(null);

    const {allowAutoHiding = true, isClosable = true, isOverride = false} = props;

    const {
        status,
        containerProps: {onAnimationEnd},
        handleClose,
    } = useToastStatus({onRemove: props.removeCallback});

    const height = useHeight({ref, isOverride});

    const containerProps = useCloseOnTimeout({
        onClose: handleClose,
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

    const getCloseButton = () => {
        if (!isClosable) {
            return null;
        }

        return (
            <Button
                view="flat-secondary"
                size="s"
                style={{position: 'absolute', top: 10, right: 10}}
                onClick={handleClose}
            >
                <Icon data={CrossIcon} />
            </Button>
        );
    };

    const {content, actions, title, className, type} = props;
    return (
        <div
            ref={ref}
            className={b(mods, className)}
            style={getStyles()}
            onAnimationEnd={onAnimationEnd}
            {...containerProps}
        >
            <div className={b('title', {bold: Boolean(content || actions)})}>
                {renderIcon({type})}
                {title}
            </div>
            {getCloseButton()}
            {content}
            {renderActions({actions, onClose: handleClose})}
        </div>
    );
}