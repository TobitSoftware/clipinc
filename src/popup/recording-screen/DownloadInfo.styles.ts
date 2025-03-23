import styled from 'styled-components';

export const StyledDownloadInfo = styled.div`
    padding: 14px 24px;
    background-color: #282828;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
`;

export const StyledDownloadCounter = styled.span`
    color: #989898;
`;

export const StyledShowDownloadsButton = styled.button`
    margin-left: auto;
    padding: 0;
    border: none;
    border-bottom: 1px dashed;

    cursor: pointer;

    transition: opacity 0.1s;

    color: #fff;
    font-size: 16px;

    &:hover {
        opacity: 0.7;
    }
`;
